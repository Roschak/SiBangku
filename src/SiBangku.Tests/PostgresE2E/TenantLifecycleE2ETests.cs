using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Net.Http.Json;
using System.Text.Json;
using System.Threading.Tasks;
using Xunit;

namespace SiBangku.Tests.PostgresE2E
{
    /// <summary>
    /// End-to-end coverage of the tenant lifecycle against a real PostgreSQL
    /// server:
    /// <list type="number">
    /// <item>provisioning a tenant through the Control API (creates the physical database),</item>
    /// <item>signing in as the tenant admin against that database,</item>
    /// <item>creating / laying out / deleting tables through the Tenant API,</item>
    /// <item>tenant isolation between two provisioned tenants.</item>
    /// </list>
    /// Every assertion is checked twice where it matters: through the HTTP API and
    /// through raw SQL against the database the API is supposed to have written to.
    /// </summary>
    [Collection(SiBangkuE2ECollection.Name)]
    public class TenantLifecycleE2ETests
    {
        private readonly SiBangkuE2EFixture _fixture;

        public TenantLifecycleE2ETests(SiBangkuE2EFixture fixture)
        {
            _fixture = fixture;
        }

        [RequiresPostgresFact]
        public async Task Provisioning_CreatesTenantDatabaseWithSeededAdminAndAuditTrail()
        {
            // Act
            var tenant = await _fixture.ProvisionTenantAsync("provisioning");

            // Assert - identifiers returned by the API
            Assert.StartsWith("TEN-", tenant.TenantId);
            Assert.False(string.IsNullOrWhiteSpace(tenant.TenantCode));
            Assert.False(string.IsNullOrWhiteSpace(tenant.TemporaryPassword));

            // Assert - the tenant database physically exists on PostgreSQL
            Assert.True(
                _fixture.Server.DatabaseExists(tenant.DatabaseName),
                $"Database '{tenant.DatabaseName}' tidak ditemukan di server PostgreSQL.");

            // Assert - schema plus the default fixtures the provisioner seeds
            Assert.Equal(4L, _fixture.Server.QueryCount(tenant.DatabaseName, "SELECT count(*) FROM tables"));
            Assert.Equal(1L, _fixture.Server.QueryCount(
                tenant.DatabaseName,
                "SELECT count(*) FROM users WHERE \"Role\" = 'TENANT_ADMIN'"));

            // Assert - the seeded credential is hashed with Argon2id (never plaintext, never BCrypt)
            var passwordHash = _fixture.Server.QueryString(
                tenant.DatabaseName,
                "SELECT \"PasswordHash\" FROM users WHERE \"UserId\" = 'tenant-admin-init'");
            Assert.NotNull(passwordHash);
            Assert.StartsWith("$argon2id$", passwordHash);

            // Assert - the control plane row lives in the isolated test database, so
            // the API really used the connection string this suite gave it.
            Assert.Equal(1L, _fixture.Server.QueryCount(
                _fixture.ControlDatabaseName,
                "SELECT count(*) FROM tenants WHERE \"TenantCode\" = @code",
                ("@code", tenant.TenantCode)));

            Assert.Equal(1L, _fixture.Server.QueryCount(
                _fixture.ControlDatabaseName,
                "SELECT count(*) FROM audit_logs WHERE \"Action\" = 'provision tenant' AND \"TenantId\" = @id",
                ("@id", tenant.TenantId)));
        }

        [RequiresPostgresFact]
        public async Task Provisioning_WithWeakAdminPassword_IsRejectedByPolicy()
        {
            // Arrange - an operator-supplied password must satisfy the platform policy.
            var suffix = Guid.NewGuid().ToString("N")[..6];
            var tenantName = $"E2E Weak {suffix}";
            var expectedCode = $"E2EWEAK{suffix}".ToUpperInvariant();

            var payload = new
            {
                tenantName,
                restaurantName = "E2E Resto Lemah",
                adminEmail = $"weak-{suffix}@e2e.sibangku.test",
                adminPassword = "123",
                trialDays = 30
            };

            // Act
            using var response = await _fixture.SendPlatformAsync(HttpMethod.Post, "/api/v1/tenants", payload);

            // Assert - rejected with an actionable reason, and nothing was persisted
            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);

            var body = await response.Content.ReadFromJsonAsync<JsonElement>();
            Assert.Equal("WEAK_PASSWORD", body.GetProperty("error").GetProperty("code").GetString());

            Assert.Equal(0L, _fixture.Server.QueryCount(
                _fixture.ControlDatabaseName,
                "SELECT count(*) FROM tenants WHERE \"TenantCode\" = @code",
                ("@code", expectedCode)));
        }

        [RequiresPostgresFact]
        public async Task TenantAdminLogin_WithProvisionedCredentials_ReturnsTenantAdminToken()
        {
            // Arrange
            var tenant = await _fixture.ProvisionTenantAsync("login");

            using var client = _fixture.CreateTenantClient();
            client.DefaultRequestHeaders.Add("x-tenant-code", tenant.TenantCode);

            // Act
            using var response = await client.PostAsJsonAsync(
                "/api/v1/auth/login",
                new { email = tenant.AdminEmail, password = SiBangkuE2EFixture.TenantAdminPassword });

            // Assert
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);

            var data = await ReadDataAsync(response);
            Assert.False(string.IsNullOrWhiteSpace(data.GetProperty("token").GetString()));

            var user = data.GetProperty("user");
            Assert.Equal(tenant.AdminEmail, user.GetProperty("email").GetString());
            Assert.Equal("TENANT_ADMIN", user.GetProperty("role").GetString());
            Assert.True(user.GetProperty("mustChangePassword").GetBoolean());

            // The protected profile of the tenant is reachable with this token.
            client.DefaultRequestHeaders.Authorization =
                new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", data.GetProperty("token").GetString());

            using var tables = await client.GetAsync("/api/v1/tables");
            Assert.Equal(HttpStatusCode.OK, tables.StatusCode);
        }

        [RequiresPostgresFact]
        public async Task TenantAdminLogin_WithWrongPassword_Returns401WithoutToken()
        {
            // Arrange
            var tenant = await _fixture.ProvisionTenantAsync("login");

            using var client = _fixture.CreateTenantClient();
            client.DefaultRequestHeaders.Add("x-tenant-code", tenant.TenantCode);

            // Act
            using var response = await client.PostAsJsonAsync(
                "/api/v1/auth/login",
                new { email = tenant.AdminEmail, password = "Wrong-Password-9!" });

            // Assert - generic failure message, never a hint about which field was wrong
            Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);

            var raw = await response.Content.ReadAsStringAsync();
            Assert.DoesNotContain("token", raw, StringComparison.OrdinalIgnoreCase);
            Assert.DoesNotContain("$argon2id$", raw, StringComparison.OrdinalIgnoreCase);
        }

        [RequiresPostgresFact]
        public async Task TenantAdminLogin_ForUnregisteredTenant_Returns400InvalidTenant()
        {
            // Arrange - a tenant code that was never provisioned on this server
            using var client = _fixture.CreateTenantClient();
            client.DefaultRequestHeaders.Add("x-tenant-code", $"E2E-GHOST-{Guid.NewGuid().ToString("N")[..6].ToUpperInvariant()}");

            // Act
            using var response = await client.PostAsJsonAsync(
                "/api/v1/auth/login",
                new { email = "nobody@e2e.sibangku.test", password = SiBangkuE2EFixture.TenantAdminPassword });

            // Assert
            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);

            var body = await response.Content.ReadFromJsonAsync<JsonElement>();
            Assert.Equal("INVALID_TENANT", body.GetProperty("error").GetProperty("code").GetString());
        }

        [RequiresPostgresFact]
        public async Task TableCrud_CreateLayoutDelete_RoundTripsThroughPostgres()
        {
            // Arrange
            var tenant = await _fixture.ProvisionTenantAsync("tables");
            var token = await _fixture.GetTenantAdminTokenAsync(tenant);

            using var client = _fixture.CreateTenantClient(token);
            client.DefaultRequestHeaders.Add("x-tenant-code", tenant.TenantCode);

            Assert.Equal(4, (await GetTableNumbersAsync(client)).Count);

            var tableNumber = $"E2E-{Guid.NewGuid().ToString("N")[..4].ToUpperInvariant()}";

            // Act - create
            using var createResponse = await client.PostAsJsonAsync("/api/v1/tables", new
            {
                tableNumber,
                shape = "round", // lowercase on purpose: the server normalises it
                capacity = 6,
                posX = 12.5,
                posY = 30.5,
                rotation = 0,
                isActive = true
            });

            // Assert - created, with server-owned identity and normalised shape
            Assert.Equal(HttpStatusCode.OK, createResponse.StatusCode);

            var created = await ReadDataAsync(createResponse);
            var tableId = created.GetProperty("tableId").GetString();
            Assert.StartsWith("tbl-", tableId);
            Assert.Equal(tableNumber, created.GetProperty("tableNumber").GetString());
            Assert.Equal("ROUND", created.GetProperty("shape").GetString());

            // Assert - the row is really in the tenant database
            Assert.Equal(1L, _fixture.Server.QueryCount(
                tenant.DatabaseName,
                "SELECT count(*) FROM tables WHERE \"TableId\" = @id",
                ("@id", tableId)));

            // Assert - the unique table number is enforced by the server
            using var duplicate = await client.PostAsJsonAsync("/api/v1/tables", new
            {
                tableNumber,
                shape = "SQUARE",
                capacity = 4
            });
            Assert.Equal(HttpStatusCode.Conflict, duplicate.StatusCode);

            // Assert - allowlists reject unknown shapes and out-of-range capacity
            using var badShape = await client.PostAsJsonAsync("/api/v1/tables", new
            {
                tableNumber = $"{tableNumber}-X",
                shape = "TRIANGLE",
                capacity = 4
            });
            Assert.Equal(HttpStatusCode.BadRequest, badShape.StatusCode);

            using var badCapacity = await client.PostAsJsonAsync("/api/v1/tables", new
            {
                tableNumber = $"{tableNumber}-Y",
                shape = "SQUARE",
                capacity = 0
            });
            Assert.Equal(HttpStatusCode.BadRequest, badCapacity.StatusCode);

            Assert.Equal(1L, _fixture.Server.QueryCount(
                tenant.DatabaseName,
                "SELECT count(*) FROM tables WHERE \"TableNumber\" LIKE @pattern",
                ("@pattern", $"{tableNumber}%")));

            // Act - visual layout update (rotation is normalised into [0, 360))
            using var layoutResponse = await client.PutAsJsonAsync("/api/v1/tables/layout", new[]
            {
                new { tableId, posX = 123.5, posY = 456.25, rotation = 372 }
            });

            // Assert
            Assert.Equal(HttpStatusCode.OK, layoutResponse.StatusCode);

            Assert.Equal(123.5, _fixture.Server.QueryDouble(
                tenant.DatabaseName,
                "SELECT \"PosX\" FROM tables WHERE \"TableId\" = @id",
                ("@id", tableId)), 2);

            Assert.Equal(456.25, _fixture.Server.QueryDouble(
                tenant.DatabaseName,
                "SELECT \"PosY\" FROM tables WHERE \"TableId\" = @id",
                ("@id", tableId)), 2);

            Assert.Equal(12L, _fixture.Server.QueryCount(
                tenant.DatabaseName,
                "SELECT \"Rotation\" FROM tables WHERE \"TableId\" = @id",
                ("@id", tableId)));

            // Act - delete
            using var deleteResponse = await client.DeleteAsync($"/api/v1/tables/{tableId}");

            // Assert - gone from the database, gone from the listing, and deleting
            // a non-existent id is a clean 404 (never a 500).
            Assert.Equal(HttpStatusCode.OK, deleteResponse.StatusCode);
            Assert.Equal(0L, _fixture.Server.QueryCount(
                tenant.DatabaseName,
                "SELECT count(*) FROM tables WHERE \"TableId\" = @id",
                ("@id", tableId)));
            Assert.DoesNotContain(tableNumber, await GetTableNumbersAsync(client));

            using var secondDelete = await client.DeleteAsync($"/api/v1/tables/{tableId}");
            Assert.Equal(HttpStatusCode.NotFound, secondDelete.StatusCode);
        }

        [RequiresPostgresFact]
        public async Task TableCrud_WithoutToken_IsRejectedBeforeAnyWrite()
        {
            // Arrange - anonymous caller on the public route prefix
            var tenant = await _fixture.ProvisionTenantAsync("tables");

            using var client = _fixture.CreateTenantClient();
            client.DefaultRequestHeaders.Add("x-tenant-code", tenant.TenantCode);

            // Act
            using var response = await client.PostAsJsonAsync("/api/v1/tables", new
            {
                tableNumber = "ANON-1",
                shape = "SQUARE",
                capacity = 2
            });

            // Assert - authorization is enforced server side, not by hiding UI
            Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
            Assert.Equal(0L, _fixture.Server.QueryCount(
                tenant.DatabaseName,
                "SELECT count(*) FROM tables WHERE \"TableNumber\" = 'ANON-1'"));
        }

        [RequiresPostgresFact]
        public async Task TableCrud_WithTokenOfAnotherTenant_IsForbidden()
        {
            // Arrange - a valid tenant admin token, but for a different tenant
            var tenantA = await _fixture.ProvisionTenantAsync("tables");
            var tenantB = await _fixture.ProvisionTenantAsync("isolation");
            var tokenB = await _fixture.GetTenantAdminTokenAsync(tenantB);

            using var client = _fixture.CreateTenantClient(tokenB);
            client.DefaultRequestHeaders.Add("x-tenant-code", tenantA.TenantCode);

            // Act - write into tenant A while authenticated as tenant B
            using var response = await client.PostAsJsonAsync("/api/v1/tables", new
            {
                tableNumber = "X-TENANT-1",
                shape = "SQUARE",
                capacity = 2
            });

            // Assert - the TenantId claim is compared against the resolved tenant
            Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);

            var body = await response.Content.ReadFromJsonAsync<JsonElement>();
            Assert.Equal("FORBIDDEN", body.GetProperty("error").GetProperty("code").GetString());

            // Nothing was written into the other tenant's database.
            Assert.Equal(0L, _fixture.Server.QueryCount(
                tenantA.DatabaseName,
                "SELECT count(*) FROM tables WHERE \"TableNumber\" = 'X-TENANT-1'"));
        }

        [RequiresPostgresFact]
        public async Task PublicReservation_OnProvisionedTenant_PersistsUtcReservation()
        {
            // Arrange - the guest booking page is public, no token involved
            var tenant = await _fixture.ProvisionTenantAsync("tables");

            using var client = _fixture.CreateTenantClient();
            client.DefaultRequestHeaders.Add("x-tenant-code", tenant.TenantCode);

            var guestEmail = $"tamu-{Guid.NewGuid().ToString("N")[..8]}@e2e.sibangku.test";
            var date = DateTime.UtcNow.Date.AddDays(3).ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);

            // Act
            using var response = await client.PostAsJsonAsync("/api/v1/reservations", new
            {
                name = "Tamu End To End",
                email = guestEmail,
                phone = "081234567890",
                date,
                startTime = "18:00",
                endTime = "19:00",
                guestCount = 2,
                notes = "End-to-end regression: PostgreSQL timestamptz write path"
            });

            // Assert - the write path that used to fail on a real database
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);

            var data = await ReadDataAsync(response);
            var reservationId = data.GetProperty("id").GetString();

            Assert.Equal(DateTimeKind.Utc, data.GetProperty("date").GetDateTime().Kind);
            Assert.False(string.IsNullOrWhiteSpace(data.GetProperty("tableId").GetString()));

            Assert.Equal(1L, _fixture.Server.QueryCount(
                tenant.DatabaseName,
                "SELECT count(*) FROM reservations WHERE \"Id\" = @id",
                ("@id", reservationId)));

            Assert.Equal(1L, _fixture.Server.QueryCount(
                tenant.DatabaseName,
                "SELECT count(*) FROM customers WHERE \"Email\" = @email",
                ("@email", guestEmail)));
        }

        private static async Task<List<string>> GetTableNumbersAsync(HttpClient client)
        {
            using var response = await client.GetAsync("/api/v1/tables");
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);

            var data = await ReadDataAsync(response);
            return data.EnumerateArray()
                .Select(table => table.GetProperty("tableNumber").GetString()!)
                .ToList();
        }

        private static async Task<JsonElement> ReadDataAsync(HttpResponseMessage response)
        {
            var body = await response.Content.ReadAsStringAsync();

            using var document = JsonDocument.Parse(body);
            return document.RootElement.Clone().GetProperty("data");
        }
    }
}
