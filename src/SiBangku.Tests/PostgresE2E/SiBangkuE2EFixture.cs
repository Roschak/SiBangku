using System;
using System.Collections.Generic;
using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

namespace SiBangku.Tests.PostgresE2E
{
    /// <summary>
    /// A tenant provisioned through the real Control API during the end-to-end run.
    /// </summary>
    internal sealed record ProvisionedTenant(
        string Key,
        string TenantId,
        string TenantCode,
        string DatabaseName,
        string AdminEmail,
        string TemporaryPassword);

    /// <summary>
    /// Shared context for the PostgreSQL end-to-end suite: one isolated control
    /// database, a live Control API and a live Tenant API wired to it, plus the
    /// tenants provisioned while the tests run.
    /// <para>
    /// Nothing here is mocked: the APIs talk to PostgreSQL over Npgsql, the
    /// provisioner creates real tenant databases, and the tests assert against
    /// those databases with raw SQL.
    /// </para>
    /// </summary>
    public sealed class SiBangkuE2EFixture : IAsyncLifetime
    {
        /// <summary>Seeded by ControlDbSeeder in the Development environment only.</summary>
        private const string PlatformAdminUsername = "admin";
        private const string PlatformAdminPassword = "admin";

        private const string TestJwtSecret = "sibangku-e2e-only-jwt-signing-secret-0123456789";
        private const string TestMasterApiKey = "sibangku-e2e-only-master-api-key-0123456789";

        /// <summary>
        /// Password handed to the provisioner for every test tenant. It satisfies
        /// the platform policy (>=12 chars, 3 of 4 character classes, no reserved
        /// token, no account name) so the tests exercise the accepted path.
        /// </summary>
        internal const string TenantAdminPassword = "E2eTenantLogin-7!z";

        private readonly SemaphoreSlim _gate = new(1, 1);
        private readonly Dictionary<string, ProvisionedTenant> _tenants = new(StringComparer.OrdinalIgnoreCase);
        private readonly Dictionary<string, string> _tenantTokens = new(StringComparer.OrdinalIgnoreCase);
        private readonly List<string> _createdDatabases = new();

        private WebApplicationFactory<SiBangku.ControlApi.Program> _controlApi = null!;
        private WebApplicationFactory<SiBangku.TenantApi.Program> _tenantApi = null!;
        private HttpClient _platformClient = null!;
        private string? _platformToken;

        internal PostgresTestServer Server { get; private set; } = null!;

        /// <summary>The isolated control-plane database created for this test run.</summary>
        internal string ControlDatabaseName { get; private set; } = string.Empty;

        internal string ControlConnectionString { get; private set; } = string.Empty;

        public async Task InitializeAsync()
        {
            Server = new PostgresTestServer(PostgresTestEnvironment.AdminConnectionString);

            var runToken = Guid.NewGuid().ToString("N")[..8];
            ControlDatabaseName = Server.CreateDatabase("sibangku_e2e_control", runToken);
            _createdDatabases.Add(ControlDatabaseName);
            ControlConnectionString = Server.BuildConnectionString(ControlDatabaseName);

            _controlApi = BuildControlApiFactory();
            _tenantApi = BuildTenantApiFactory();

            _platformClient = _controlApi.CreateClient();
            _platformClient.Timeout = TimeSpan.FromSeconds(60);

            // Touch the API so the host starts, the control schema is created and
            // the Development platform account is seeded.
            using var health = await _platformClient.GetAsync("/api/v1/health");
            health.EnsureSuccessStatusCode();
        }

        public Task DisposeAsync()
        {
            _platformClient?.Dispose();

            try { _controlApi?.Dispose(); } catch { /* teardown must never mask a test failure */ }
            try { _tenantApi?.Dispose(); } catch { /* teardown must never mask a test failure */ }

            foreach (var database in _createdDatabases)
            {
                Server?.DropDatabase(database);
            }

            _gate.Dispose();
            return Task.CompletedTask;
        }

        /// <summary>HTTP client for the Tenant API; pass a token to act as tenant staff.</summary>
        internal HttpClient CreateTenantClient(string? bearerToken = null)
        {
            var client = _tenantApi.CreateClient();
            client.Timeout = TimeSpan.FromSeconds(60);

            if (!string.IsNullOrEmpty(bearerToken))
            {
                client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", bearerToken);
            }

            return client;
        }

        /// <summary>Authenticated request against the Control API as SUPER_ADMIN.</summary>
        internal async Task<HttpResponseMessage> SendPlatformAsync(HttpMethod method, string path, object? body = null)
        {
            var token = await GetPlatformTokenAsync();
            return await SendPlatformWithTokenAsync(token, method, path, body);
        }

        private async Task<HttpResponseMessage> SendPlatformWithTokenAsync(
            string token,
            HttpMethod method,
            string path,
            object? body)
        {
            var request = new HttpRequestMessage(method, path);
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
            if (body != null)
            {
                request.Content = JsonContent.Create(body);
            }

            return await _platformClient.SendAsync(request);
        }

        /// <summary>Signs in the seeded Development platform account (cached).</summary>
        internal async Task<string> GetPlatformTokenAsync()
        {
            if (_platformToken != null) return _platformToken;

            await _gate.WaitAsync();
            try
            {
                if (_platformToken != null) return _platformToken;

                using var response = await _platformClient.PostAsJsonAsync(
                    "/api/v1/auth/login",
                    new { email = PlatformAdminUsername, password = PlatformAdminPassword });

                _platformToken = await ReadTokenAsync(response, "platform admin");
                return _platformToken;
            }
            finally
            {
                _gate.Release();
            }
        }

        /// <summary>
        /// Provisions a tenant through <c>POST /api/v1/tenants</c> and caches it per
        /// key, so several tests can share one tenant without paying for extra
        /// provisioning (and without tripping the auth rate limit).
        /// </summary>
        internal async Task<ProvisionedTenant> ProvisionTenantAsync(string key)
        {
            // Resolve the platform token *before* taking the gate: the sign-in path
            // needs the same gate, and SemaphoreSlim is not reentrant.
            var token = await GetPlatformTokenAsync();

            await _gate.WaitAsync();
            try
            {
                if (_tenants.TryGetValue(key, out var cached)) return cached;

                var suffix = Guid.NewGuid().ToString("N")[..6];
                var tenantName = $"E2E {key} {suffix}";
                var adminEmail = $"owner-{key}-{suffix}@e2e.sibangku.test";

                var payload = new
                {
                    tenantName,
                    restaurantName = "E2E Resto",
                    adminEmail,
                    adminPassword = TenantAdminPassword,
                    trialDays = 30
                };

                using var response = await SendPlatformWithTokenAsync(token, HttpMethod.Post, "/api/v1/tenants", payload);
                var body = await response.Content.ReadAsStringAsync();

                if (response.StatusCode != HttpStatusCode.OK)
                {
                    throw new InvalidOperationException(
                        $"Provisioning tenant '{tenantName}' gagal ({(int)response.StatusCode}): {body}");
                }

                using var document = JsonDocument.Parse(body);
                var data = document.RootElement.GetProperty("data");

                var tenant = new ProvisionedTenant(
                    key,
                    data.GetProperty("tenantId").GetString()!,
                    data.GetProperty("tenantCode").GetString()!,
                    data.GetProperty("databaseName").GetString()!,
                    data.GetProperty("adminEmail").GetString()!,
                    data.GetProperty("temporaryPassword").GetString()!);

                _tenants[key] = tenant;
                _createdDatabases.Add(tenant.DatabaseName);
                return tenant;
            }
            finally
            {
                _gate.Release();
            }
        }

        /// <summary>Signs a provisioned tenant admin in against the real tenant database (cached).</summary>
        internal async Task<string> GetTenantAdminTokenAsync(ProvisionedTenant tenant)
        {
            if (_tenantTokens.TryGetValue(tenant.Key, out var cached)) return cached;

            await _gate.WaitAsync();
            try
            {
                if (_tenantTokens.TryGetValue(tenant.Key, out cached)) return cached;

                using var client = CreateTenantClient();
                client.DefaultRequestHeaders.Add("x-tenant-code", tenant.TenantCode);

                using var response = await client.PostAsJsonAsync(
                    "/api/v1/auth/login",
                    new { email = tenant.AdminEmail, password = TenantAdminPassword });

                var token = await ReadTokenAsync(response, $"tenant admin {tenant.TenantCode}");
                _tenantTokens[tenant.Key] = token;
                return token;
            }
            finally
            {
                _gate.Release();
            }
        }

        /// <summary>
        /// Attempts a tenant sign-in with an explicit password and without touching
        /// the token cache. Used by the credential-rotation tests, which must try the
        /// old and the new password. Every call consumes one permit of the "auth"
        /// rate limit (10/minute per client), so keep the number of calls low.
        /// </summary>
        internal async Task<(HttpStatusCode Status, string Body)> TryTenantLoginAsync(
            ProvisionedTenant tenant,
            string password)
        {
            using var client = CreateTenantClient();
            client.DefaultRequestHeaders.Add("x-tenant-code", tenant.TenantCode);

            using var response = await client.PostAsJsonAsync(
                "/api/v1/auth/login",
                new { email = tenant.AdminEmail, password });

            return (response.StatusCode, await response.Content.ReadAsStringAsync());
        }

        private static async Task<string> ReadTokenAsync(HttpResponseMessage response, string description)
        {
            var body = await response.Content.ReadAsStringAsync();

            if (response.StatusCode != HttpStatusCode.OK)
            {
                throw new InvalidOperationException(
                    $"Login {description} gagal ({(int)response.StatusCode}): {body}");
            }

            using var document = JsonDocument.Parse(body);
            return document.RootElement.GetProperty("data").GetProperty("token").GetString()!;
        }

        private WebApplicationFactory<SiBangku.ControlApi.Program> BuildControlApiFactory() =>
            new WebApplicationFactory<SiBangku.ControlApi.Program>()
                .WithWebHostBuilder(builder => ApplyTestConfiguration(builder));

        private WebApplicationFactory<SiBangku.TenantApi.Program> BuildTenantApiFactory() =>
            new WebApplicationFactory<SiBangku.TenantApi.Program>()
                .WithWebHostBuilder(builder => ApplyTestConfiguration(builder));

        /// <summary>
        /// Points both APIs at the isolated control database of this run. Without
        /// this the suite would silently exercise the developer's own database.
        /// </summary>
        private void ApplyTestConfiguration(IWebHostBuilder builder)
        {
            builder.UseEnvironment("Development");
            builder.UseSetting("UseInMemoryDatabase", "false");
            builder.UseSetting("CONTROL_DATABASE_URL", ControlConnectionString);
            builder.UseSetting("JWT_SECRET", TestJwtSecret);
            builder.UseSetting("MASTER_API_KEY", TestMasterApiKey);
            builder.UseSetting("CORS_ALLOWED_ORIGINS", "http://localhost:3000");
        }
    }

    /// <summary>
    /// Groups the PostgreSQL end-to-end tests so they share one fixture and never
    /// run in parallel with other collections (they create and drop databases).
    /// </summary>
    [CollectionDefinition(Name, DisableParallelization = true)]
    public sealed class SiBangkuE2ECollection : ICollectionFixture<SiBangkuE2EFixture>
    {
        public const string Name = "postgres-e2e";
    }
}
