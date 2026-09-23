using System;
using Npgsql;

namespace SiBangku.Tests.PostgresE2E
{
    /// <summary>
    /// Resolves the PostgreSQL server used by the end-to-end suite and reports
    /// whether it is reachable.
    /// <para>
    /// The suite creates and drops its own databases on that server, so the
    /// credentials only need the CREATE DATABASE privilege. In CI the connection
    /// string comes from the <c>postgres</c> service container; locally it
    /// defaults to the docker-compose development server.
    /// </para>
    /// </summary>
    internal static class PostgresTestEnvironment
    {
        /// <summary>Environment variable holding the connection string of the *maintenance* database.</summary>
        internal const string ConnectionStringVariable = "SIBANGKU_TEST_POSTGRES";

        /// <summary>Set to "1" to skip the PostgreSQL end-to-end suite explicitly.</summary>
        internal const string SkipVariable = "SIBANGKU_SKIP_POSTGRES_E2E";

        /// <summary>
        /// Fallback that matches docker-compose.yml (user <c>sibangku</c> is the
        /// superuser created by the official postgres image).
        /// </summary>
        internal const string DefaultConnectionString =
            "Host=localhost;Port=5432;Database=postgres;Username=sibangku;Password=sibangku_dev";

        private static string _resolvedConnectionString = string.Empty;

        /// <summary>Connection string of the maintenance database ("postgres").</summary>
        internal static string AdminConnectionString
        {
            get
            {
                if (!string.IsNullOrEmpty(_resolvedConnectionString)) return _resolvedConnectionString;
                _ = Probe.Value;
                return !string.IsNullOrEmpty(_resolvedConnectionString) ? _resolvedConnectionString : DefaultConnectionString;
            }
        }

        private static readonly Lazy<(bool Available, string Reason)> Probe = new(ProbeServer);

        internal static bool IsAvailable => Probe.Value.Available;

        internal static string UnavailableReason => Probe.Value.Reason;

        private static (bool, string) ProbeServer()
        {
            if (Environment.GetEnvironmentVariable(SkipVariable) == "1")
            {
                return (false, $"{SkipVariable}=1 diatur, sehingga tes PostgreSQL dilewati.");
            }

            var envConn = Environment.GetEnvironmentVariable(ConnectionStringVariable);
            var candidates = new System.Collections.Generic.List<string>();
            if (!string.IsNullOrWhiteSpace(envConn))
            {
                candidates.Add(envConn);
            }
            else
            {
                candidates.Add(DefaultConnectionString);
                candidates.Add("Host=172.19.57.143;Port=5432;Database=postgres;Username=sibangku;Password=sibangku_dev");
                candidates.Add("Host=127.0.0.1;Port=5432;Database=postgres;Username=sibangku;Password=sibangku_dev");
            }

            Exception? lastEx = null;
            foreach (var connStr in candidates)
            {
                try
                {
                    var builder = new NpgsqlConnectionStringBuilder(connStr) { Timeout = 3 };
                    using var connection = new NpgsqlConnection(builder.ConnectionString);
                    connection.Open();

                    using var command = new NpgsqlCommand("SELECT current_setting('server_version')", connection);
                    var version = command.ExecuteScalar() as string;

                    _resolvedConnectionString = connStr;
                    return (true, $"PostgreSQL {version} ({builder.Host}:{builder.Port})");
                }
                catch (Exception ex)
                {
                    lastEx = ex;
                }
            }

            return (false,
                $"server PostgreSQL tidak terjangkau via {ConnectionStringVariable} ({lastEx?.GetType().Name}: {lastEx?.Message}). " +
                "Jalankan 'docker compose up -d postgres' atau set variabel tersebut ke server tes Anda.");
        }
    }

    /// <summary>
    /// Marks an end-to-end test that requires a real PostgreSQL server. When no
    /// server is reachable the test is reported as skipped instead of failing,
    /// so contributors without Docker still get a green unit/integration run.
    /// </summary>
    public sealed class RequiresPostgresFactAttribute : FactAttribute
    {
        public RequiresPostgresFactAttribute()
        {
            if (!PostgresTestEnvironment.IsAvailable)
            {
                Skip = $"Dilewati: {PostgresTestEnvironment.UnavailableReason}";
            }
        }
    }
}
