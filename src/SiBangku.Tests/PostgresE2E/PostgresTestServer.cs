using System;
using System.Text.RegularExpressions;
using System.Threading;
using Npgsql;

namespace SiBangku.Tests.PostgresE2E
{
    /// <summary>
    /// Thin wrapper around the maintenance database of the test PostgreSQL
    /// server. It only creates/drops databases and runs read-only assertions -
    /// never application logic - so the tests can verify what the services
    /// actually persisted instead of trusting the API response.
    /// </summary>
    internal sealed class PostgresTestServer
    {
        private static readonly Regex SafeIdentifier = new("^[a-z0-9_]{1,60}$", RegexOptions.Compiled);

        private readonly string _adminConnectionString;

        internal PostgresTestServer(string adminConnectionString)
        {
            _adminConnectionString = adminConnectionString;
        }

        /// <summary>Connection string for one of the databases living on this server.</summary>
        internal string BuildConnectionString(string database)
        {
            var builder = new NpgsqlConnectionStringBuilder(_adminConnectionString) { Database = database };
            return builder.ConnectionString;
        }

        /// <summary>
        /// Drops (if present) and recreates the database, so a leftover from an
        /// interrupted run can never make the suite fail.
        /// </summary>
        internal string CreateDatabase(string prefix, string suffix)
        {
            var name = Sanitize($"{prefix}_{suffix}");

            DropDatabase(name);
            ExecuteOnAdmin($"CREATE DATABASE {Quote(name)}");

            return name;
        }

        /// <summary>
        /// True when the database exists on the server. The catalog is read from
        /// the maintenance database, never from the database being checked.
        /// </summary>
        internal bool DatabaseExists(string database) =>
            Convert.ToInt64(
                ScalarOnAdmin("SELECT count(*) FROM pg_database WHERE datname = @name", ("@name", database)) ?? 0L) > 0;

        /// <summary>Best-effort teardown: never fails the suite when it cannot drop.</summary>
        internal void DropDatabase(string database)
        {
            if (!SafeIdentifier.IsMatch(database)) return;

            // EF/Npgsql keeps physical connections alive in the pool, and
            // PostgreSQL refuses to drop a database that still has sessions.
            try
            {
                NpgsqlConnection.ClearAllPools();
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[E2E] ClearAllPools gagal: {ex.Message}");
            }

            for (var attempt = 1; attempt <= 3; attempt++)
            {
                try
                {
                    ExecuteOnAdmin(
                        "SELECT pg_terminate_backend(pid) FROM pg_stat_activity " +
                        "WHERE datname = @name AND pid <> pg_backend_pid()",
                        ("@name", database));

                    ExecuteOnAdmin($"DROP DATABASE IF EXISTS {Quote(database)}");
                    return;
                }
                catch (Exception ex)
                {
                    if (attempt == 3)
                    {
                        // Leftovers are harmless (the next run recreates the
                        // database), so cleanup never fails the suite.
                        Console.WriteLine($"[E2E] Gagal menghapus database '{database}': {ex.Message}");
                        return;
                    }

                    Thread.Sleep(250);
                }
            }
        }

        /// <summary>
        /// Runs a non-query statement against a test database. Only used to set up
        /// a state the API itself can no longer produce (e.g. a settings row left
        /// behind by an older deployment).
        /// </summary>
        internal void Execute(string database, string sql, params (string Name, object? Value)[] parameters)
        {
            using var connection = new NpgsqlConnection(BuildConnectionString(database));
            connection.Open();

            using var command = BuildCommand(connection, sql, parameters);
            command.ExecuteNonQuery();
        }

        internal long QueryCount(string database, string sql, params (string Name, object? Value)[] parameters) =>
            Convert.ToInt64(Scalar(database, sql, parameters) ?? 0L);

        internal double QueryDouble(string database, string sql, params (string Name, object? Value)[] parameters) =>
            Convert.ToDouble(Scalar(database, sql, parameters) ?? 0d);

        internal string? QueryString(string database, string sql, params (string Name, object? Value)[] parameters) =>
            Scalar(database, sql, parameters) as string;

        private object? Scalar(string database, string sql, params (string Name, object? Value)[] parameters) =>
            ExecuteScalar(BuildConnectionString(database), sql, parameters);

        private object? ScalarOnAdmin(string sql, params (string Name, object? Value)[] parameters) =>
            ExecuteScalar(_adminConnectionString, sql, parameters);

        private static object? ExecuteScalar(
            string connectionString,
            string sql,
            params (string Name, object? Value)[] parameters)
        {
            using var connection = new NpgsqlConnection(connectionString);
            connection.Open();

            using var command = BuildCommand(connection, sql, parameters);
            var result = command.ExecuteScalar();
            return result is DBNull ? null : result;
        }

        private void ExecuteOnAdmin(string sql, params (string Name, object? Value)[] parameters)
        {
            using var connection = new NpgsqlConnection(_adminConnectionString);
            connection.Open();

            using var command = BuildCommand(connection, sql, parameters);
            command.ExecuteNonQuery();
        }

        private static NpgsqlCommand BuildCommand(
            NpgsqlConnection connection,
            string sql,
            params (string Name, object? Value)[] parameters)
        {
            var command = new NpgsqlCommand(sql, connection);
            foreach (var (name, value) in parameters)
            {
                command.Parameters.AddWithValue(name, value ?? DBNull.Value);
            }

            return command;
        }

        private static string Sanitize(string value) =>
            Regex.Replace(value.ToLowerInvariant(), "[^a-z0-9_]", string.Empty);

        /// <summary>Quotes an identifier that was already validated by <see cref="SafeIdentifier"/>.</summary>
        private static string Quote(string identifier)
        {
            if (!SafeIdentifier.IsMatch(identifier))
            {
                throw new ArgumentException($"Nama database tidak aman: '{identifier}'.", nameof(identifier));
            }

            return $"\"{identifier}\"";
        }
    }
}
