using System;
using System.Text.RegularExpressions;
using System.Web;
using Npgsql;

namespace SiBangku.Db
{
    /// <summary>
    /// Centralized security and connection management for PostgreSQL databases.
    /// Ensures SSL/TLS parameters are preserved across tenant connections,
    /// protects against SQL injection in database identifiers, parses connection URIs,
    /// and configures safe connection pooling to prevent server resource exhaustion.
    /// </summary>
    public static class PostgresConnectionHelper
    {
        private static readonly Regex SafeDbIdentifierRegex = new("^[a-zA-Z0-9_]{1,63}$", RegexOptions.Compiled);

        /// <summary>
        /// Validates that a PostgreSQL database identifier conforms to PostgreSQL naming rules
        /// and contains only alphanumeric characters or underscores (max 63 chars), preventing SQL injection.
        /// </summary>
        public static bool ValidateDatabaseIdentifier(string? identifier)
        {
            if (string.IsNullOrWhiteSpace(identifier))
            {
                return false;
            }

            return SafeDbIdentifierRegex.IsMatch(identifier.Trim());
        }

        /// <summary>
        /// Sanitizes an input string into a safe database identifier (lowercase, [a-z0-9_], max 63 characters).
        /// </summary>
        public static string SanitizeDatabaseIdentifier(string? input)
        {
            if (string.IsNullOrWhiteSpace(input))
            {
                return string.Empty;
            }

            var lowercase = input.Trim().ToLowerInvariant();
            var sanitized = Regex.Replace(lowercase, @"[^a-z0-9_]", "");
            return sanitized.Length > 63 ? sanitized[..63] : sanitized;
        }

        /// <summary>
        /// Normalizes a raw connection string or URI into a standardized, secure NpgsqlConnectionStringBuilder.
        /// Supports standard URI format (postgresql://user:pass@host:5432/dbname) and ADO.NET format.
        /// Applies security baselines: safe timeouts, keepalives, and SSL configurations.
        /// </summary>
        public static NpgsqlConnectionStringBuilder NormalizeConnectionString(string? rawConnectionString, bool isProduction = false)
        {
            if (string.IsNullOrWhiteSpace(rawConnectionString))
            {
                rawConnectionString = "Host=localhost;Database=sibangku_control;Username=sibangku;Password=sibangku_dev";
            }

            rawConnectionString = rawConnectionString.Trim();
            NpgsqlConnectionStringBuilder builder;

            // Handle URI format: postgresql:// or postgres://
            if (rawConnectionString.StartsWith("postgresql://", StringComparison.OrdinalIgnoreCase) ||
                rawConnectionString.StartsWith("postgres://", StringComparison.OrdinalIgnoreCase))
            {
                builder = ParsePostgreSqlUri(rawConnectionString);
            }
            else
            {
                builder = new NpgsqlConnectionStringBuilder(rawConnectionString);
            }

            // Enforce connection security & resilience defaults if not explicitly set
            if (builder.Timeout <= 0 || builder.Timeout > 60)
            {
                builder.Timeout = 15; // 15-second network timeout prevents hanging threads
            }

            if (builder.CommandTimeout <= 0 || builder.CommandTimeout > 120)
            {
                builder.CommandTimeout = 30; // 30-second command timeout prevents runaway queries
            }

            if (builder.KeepAlive <= 0)
            {
                builder.KeepAlive = 30; // 30-second TCP keepalive prevents NAT dropouts
            }

            // Enforce SSL for production environments if not specified
            if (isProduction && builder.SslMode == SslMode.Disable)
            {
                builder.SslMode = SslMode.Require;
            }

            return builder;
        }

        /// <summary>
        /// Builds a connection string for an isolated tenant database, preserving all SSL/TLS certificates,
        /// host, port, authentication credentials, and setting tenant-safe connection pool limits.
        /// </summary>
        public static string BuildTenantConnectionString(string baseConnectionString, string tenantDbName, bool isProduction = false)
        {
            if (!ValidateDatabaseIdentifier(tenantDbName))
            {
                throw new ArgumentException($"Nama basis data tenant tidak aman atau tidak valid: '{tenantDbName}'", nameof(tenantDbName));
            }

            var builder = NormalizeConnectionString(baseConnectionString, isProduction);
            builder.Database = tenantDbName;

            // Multi-tenant connection pool hardening:
            // Dynamic tenant databases share the PostgreSQL server connection pool.
            // Restricting MaxPoolSize and setting short idle lifetime prevents pool exhaustion.
            builder.Pooling = true;
            builder.MaxPoolSize = Math.Clamp(builder.MaxPoolSize, 5, 20);
            builder.MinPoolSize = 0;
            builder.ConnectionIdleLifetime = 15; // Reclaim idle tenant connections after 15 seconds

            return builder.ConnectionString;
        }

        /// <summary>
        /// Builds a connection string for the maintenance database (defaults to 'postgres')
        /// preserving all SSL/TLS credentials and security parameters.
        /// </summary>
        public static string BuildMaintenanceConnectionString(string baseConnectionString, string maintenanceDb = "postgres", bool isProduction = false)
        {
            if (!ValidateDatabaseIdentifier(maintenanceDb))
            {
                maintenanceDb = "postgres";
            }

            var builder = NormalizeConnectionString(baseConnectionString, isProduction);
            builder.Database = maintenanceDb;

            return builder.ConnectionString;
        }

        /// <summary>
        /// Safely verifies whether a PostgreSQL physical database exists on the server,
        /// and creates it if it does not, using parameterized checks and safe DDL execution.
        /// Protects against SQL injection by validating the identifier before executing DDL.
        /// </summary>
        public static async Task<bool> EnsureDatabaseExistsAsync(string baseConnectionString, string dbName, bool isProduction = false)
        {
            if (!ValidateDatabaseIdentifier(dbName))
            {
                throw new ArgumentException($"Nama basis data tidak aman atau tidak valid: '{dbName}'", nameof(dbName));
            }

            var maintenanceConn = BuildMaintenanceConnectionString(baseConnectionString, "sibangku_control", isProduction);
            NpgsqlConnection? conn = null;
            try
            {
                conn = new NpgsqlConnection(maintenanceConn);
                await conn.OpenAsync();
            }
            catch
            {
                var postgresFallback = BuildMaintenanceConnectionString(baseConnectionString, "postgres", isProduction);
                conn = new NpgsqlConnection(postgresFallback);
                await conn.OpenAsync();
            }

            await using (conn)
            {
                var checkQuery = "SELECT 1 FROM pg_database WHERE datname = @dbName";
                await using var checkCmd = new NpgsqlCommand(checkQuery, conn);
                checkCmd.Parameters.AddWithValue("dbName", dbName);
                var exists = await checkCmd.ExecuteScalarAsync();

                if (exists == null)
                {
                    var createQuery = $"CREATE DATABASE \"{dbName}\"";
                    await using var createCmd = new NpgsqlCommand(createQuery, conn);
                    try
                    {
                        await createCmd.ExecuteNonQueryAsync();
                        return true;
                    }
                    catch (PostgresException pex) when (pex.SqlState == "42P04") // duplicate_database
                    {
                        // Concurrently created by another process, safe to ignore
                        return true;
                    }
                }

                return false;
            }
        }

        /// <summary>
        /// Masks the password in a connection string for safe diagnostic logging without leaking credentials.
        /// </summary>
        public static string MaskConnectionString(string? connectionString)
        {
            if (string.IsNullOrWhiteSpace(connectionString)) return string.Empty;

            try
            {
                var builder = new NpgsqlConnectionStringBuilder(connectionString);
                if (!string.IsNullOrEmpty(builder.Password))
                {
                    builder.Password = "******";
                }
                return builder.ConnectionString;
            }
            catch
            {
                return Regex.Replace(connectionString, @"(?i)(password=)[^;]+", "$1******");
            }
        }

        private static NpgsqlConnectionStringBuilder ParsePostgreSqlUri(string uriString)
        {
            var uri = new Uri(uriString);
            var builder = new NpgsqlConnectionStringBuilder
            {
                Host = uri.Host,
                Port = uri.Port > 0 ? uri.Port : 5432
            };

            if (!string.IsNullOrEmpty(uri.UserInfo))
            {
                var userInfoParts = uri.UserInfo.Split(':', 2);
                builder.Username = Uri.UnescapeDataString(userInfoParts[0]);
                if (userInfoParts.Length > 1)
                {
                    builder.Password = Uri.UnescapeDataString(userInfoParts[1]);
                }
            }

            // Extract database name from path (e.g. /sibangku_control)
            var path = uri.AbsolutePath.TrimStart('/');
            if (!string.IsNullOrEmpty(path))
            {
                builder.Database = Uri.UnescapeDataString(path);
            }

            // Parse query parameters (e.g. ?sslmode=require)
            if (!string.IsNullOrEmpty(uri.Query))
            {
                var queryParams = HttpUtility.ParseQueryString(uri.Query);
                foreach (string? key in queryParams.AllKeys)
                {
                    if (string.IsNullOrWhiteSpace(key)) continue;
                    var val = queryParams[key];

                    if (string.Equals(key, "sslmode", StringComparison.OrdinalIgnoreCase))
                    {
                        if (Enum.TryParse<SslMode>(val, true, out var sslMode))
                        {
                            builder.SslMode = sslMode;
                        }
                    }
                }
            }

            return builder;
        }
    }
}
