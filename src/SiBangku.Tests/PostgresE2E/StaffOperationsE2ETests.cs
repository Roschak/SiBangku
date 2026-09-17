using System;
using System.Globalization;
using System.Net;
using System.Net.Http;
using System.Net.Http.Json;
using System.Text.Json;
using System.Threading.Tasks;
using SiBangku.Shared.Security;
using Xunit;

namespace SiBangku.Tests.PostgresE2E
{
    /// <summary>
    /// End-to-end coverage of the operational (staff) flows against a real
    /// PostgreSQL server: reservation status/payment transitions, tenant branding
    /// updates, and credential rotation.
    /// <para>
    /// Every mutation is verified twice - through the HTTP API and with raw SQL
    /// against the tenant database - so the assertions cannot pass on an in-memory
    /// illusion.
    /// </para>
    /// </summary>
    [Collection(SiBangkuE2ECollection.Name)]
    public class StaffOperationsE2ETests
    {
        private const string NewTenantAdminPassword = "E2eRotated-9!Qx";

        private readonly SiBangkuE2EFixture _fixture;

        public StaffOperationsE2ETests(SiBangkuE2EFixture fixture)
        {
            _fixture = fixture;
        }

        [RequiresPostgresFact]
        public async Task ReservationLifecycle_StatusAndPaymentUpdates_RoundTripThroughPostgres()
        {
            // Arrange - a guest books through the public endpoint, staff sign in.
            var tenant = await _fixture.ProvisionTenantAsync("tables");
            var token = await _fixture.GetTenantAdminTokenAsync(tenant);

            using var guestClient = _fixture.CreateTenantClient();
            guestClient.DefaultRequestHeaders.Add("x-tenant-code", tenant.TenantCode);

            using var staffClient = _fixture.CreateTenantClient(token);
            staffClient.DefaultRequestHeaders.Add("x-tenant-code", tenant.TenantCode);

            var reservation = await CreateReservationAsync(guestClient, daysAhead: 4, guests: 2);
            var reservationId = reservation.GetProperty("id").GetString();

            Assert.Equal("PENDING", reservation.GetProperty("status").GetString());
            Assert.Equal("UNPAID", reservation.GetProperty("paymentStatus").GetString());

            // Act - staff confirms the booking
            using var confirm = await PatchJsonAsync(staffClient, $"/api/v1/reservations/{reservationId}/status", new { status = "confirmed" });

            // Assert - lowercase input is normalised and the row really changed
            Assert.Equal(HttpStatusCode.OK, confirm.StatusCode);
            Assert.Equal("CONFIRMED", (await ReadDataAsync(confirm)).GetProperty("status").GetString());
            Assert.Equal("CONFIRMED", StatusOf(tenant, reservationId!));

            // Act - guest arrives and is seated, then pays
            using var seated = await PatchJsonAsync(staffClient, $"/api/v1/reservations/{reservationId}/status", new { status = "SEATED" });
            Assert.Equal(HttpStatusCode.OK, seated.StatusCode);
            Assert.Equal("SEATED", StatusOf(tenant, reservationId!));

            using var paid = await PatchJsonAsync(staffClient, $"/api/v1/reservations/{reservationId}/payment", new { paymentStatus = "PAID" });

            // Assert - paying auto-confirms the reservation (server-side rule)
            Assert.Equal(HttpStatusCode.OK, paid.StatusCode);

            var paidData = await ReadDataAsync(paid);
            Assert.Equal("PAID", paidData.GetProperty("paymentStatus").GetString());
            Assert.Equal("CONFIRMED", paidData.GetProperty("status").GetString());

            Assert.Equal("PAID", _fixture.Server.QueryString(
                tenant.DatabaseName,
                "SELECT \"PaymentStatus\" FROM reservations WHERE \"Id\" = @id",
                ("@id", reservationId)));

            Assert.Equal("CONFIRMED", StatusOf(tenant, reservationId!));
        }

        [RequiresPostgresFact]
        public async Task ReservationLifecycle_WithUnknownValues_IsRejectedWithoutSideEffects()
        {
            // Arrange
            var tenant = await _fixture.ProvisionTenantAsync("tables");
            var token = await _fixture.GetTenantAdminTokenAsync(tenant);

            using var guestClient = _fixture.CreateTenantClient();
            guestClient.DefaultRequestHeaders.Add("x-tenant-code", tenant.TenantCode);

            using var staffClient = _fixture.CreateTenantClient(token);
            staffClient.DefaultRequestHeaders.Add("x-tenant-code", tenant.TenantCode);

            var reservation = await CreateReservationAsync(guestClient, daysAhead: 6, guests: 4);
            var reservationId = reservation.GetProperty("id").GetString();

            // Act - values outside the allowlist must never reach the database
            using var badStatus = await PatchJsonAsync(staffClient, $"/api/v1/reservations/{reservationId}/status", new { status = "TOTALLY_MADE_UP" });
            using var badPayment = await PatchJsonAsync(staffClient, $"/api/v1/reservations/{reservationId}/payment", new { paymentStatus = "BITCOIN" });

            // Assert
            Assert.Equal(HttpStatusCode.BadRequest, badStatus.StatusCode);
            Assert.Equal(HttpStatusCode.BadRequest, badPayment.StatusCode);

            Assert.Equal("PENDING", StatusOf(tenant, reservationId!));
            Assert.Equal("UNPAID", _fixture.Server.QueryString(
                tenant.DatabaseName,
                "SELECT \"PaymentStatus\" FROM reservations WHERE \"Id\" = @id",
                ("@id", reservationId)));

            // Assert - unknown reservation ids are a clean 404, never a 500
            using var unknown = await PatchJsonAsync(staffClient, "/api/v1/reservations/rsv-does-not-exist/status", new { status = "CONFIRMED" });
            Assert.Equal(HttpStatusCode.NotFound, unknown.StatusCode);

            // Assert - an anonymous caller cannot mutate reservations at all
            using var anonymous = _fixture.CreateTenantClient();
            anonymous.DefaultRequestHeaders.Add("x-tenant-code", tenant.TenantCode);

            using var unauthenticated = await PatchJsonAsync(anonymous, $"/api/v1/reservations/{reservationId}/status", new { status = "CANCELLED" });
            Assert.Equal(HttpStatusCode.Unauthorized, unauthenticated.StatusCode);
            Assert.Equal("PENDING", StatusOf(tenant, reservationId!));
        }

        [RequiresPostgresFact]
        public async Task ReservationLifecycle_WithTokenOfAnotherTenant_IsForbidden()
        {
            // Arrange - a valid tenant admin token and the reservation of another tenant
            var tenantA = await _fixture.ProvisionTenantAsync("tables");
            var tenantB = await _fixture.ProvisionTenantAsync("isolation");
            var tokenB = await _fixture.GetTenantAdminTokenAsync(tenantB);

            using var guestClient = _fixture.CreateTenantClient();
            guestClient.DefaultRequestHeaders.Add("x-tenant-code", tenantA.TenantCode);

            var reservation = await CreateReservationAsync(guestClient, daysAhead: 8, guests: 2);
            var reservationId = reservation.GetProperty("id").GetString();

            // Act - tenant B staff target tenant A's reservation
            using var crossTenant = _fixture.CreateTenantClient(tokenB);
            crossTenant.DefaultRequestHeaders.Add("x-tenant-code", tenantA.TenantCode);

            using var response = await PatchJsonAsync(crossTenant, $"/api/v1/reservations/{reservationId}/status", new { status = "ARRIVED" });

            // Assert
            Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);

            var body = await response.Content.ReadFromJsonAsync<JsonElement>();
            Assert.Equal("FORBIDDEN", body.GetProperty("error").GetProperty("code").GetString());

            // Nothing was written into the other tenant's database.
            Assert.Equal("PENDING", StatusOf(tenantA, reservationId!));
        }

        [RequiresPostgresFact]
        public async Task BrandingUpdate_ByTenantAdmin_IsPersistedAndVisibleToTheGuestPortal()
        {
            // Arrange
            var tenant = await _fixture.ProvisionTenantAsync("tables");
            var token = await _fixture.GetTenantAdminTokenAsync(tenant);

            using var staffClient = _fixture.CreateTenantClient(token);
            staffClient.DefaultRequestHeaders.Add("x-tenant-code", tenant.TenantCode);

            var primaryColor = "#" + Guid.NewGuid().ToString("N")[..6];

            // Act
            using var update = await staffClient.PutAsJsonAsync("/api/v1/branding", new
            {
                branding = new
                {
                    primaryColor,
                    secondaryColor = "#101010",
                    font = "Plus Jakarta Sans",
                    logo = "https://cdn.example.test/logo.png",
                    favicon = "",
                    heroImage = ""
                },
                timeSlots = new
                {
                    slotDuration = 45,
                    maxConcurrentCovers = 12,
                    openingTime = "09:30",
                    closingTime = "21:30"
                }
            });

            // Assert - accepted and really persisted as JSON in the settings table
            Assert.Equal(HttpStatusCode.OK, update.StatusCode);

            var storedBranding = _fixture.Server.QueryString(
                tenant.DatabaseName,
                "SELECT \"Value\" FROM settings WHERE \"Key\" = 'branding'");

            Assert.NotNull(storedBranding);
            Assert.Contains(primaryColor, storedBranding, StringComparison.OrdinalIgnoreCase);

            var storedSlots = _fixture.Server.QueryString(
                tenant.DatabaseName,
                "SELECT \"Value\" FROM settings WHERE \"Key\" = 'time_slots'");

            Assert.NotNull(storedSlots);
            Assert.Contains("45", storedSlots, StringComparison.Ordinal);

            // Assert - the composite endpoint used by the portals reports the new theme
            using var composite = await staffClient.GetAsync("/api/v1/branding");
            Assert.Equal(HttpStatusCode.OK, composite.StatusCode);

            var compositeData = await ReadDataAsync(composite);
            Assert.Equal(primaryColor, compositeData.GetProperty("branding").GetProperty("primaryColor").GetString());
            Assert.Equal(45, compositeData.GetProperty("timeSlots").GetProperty("slotDuration").GetInt32());
            Assert.Equal(tenant.TenantCode, compositeData.GetProperty("tenant").GetProperty("tenantCode").GetString());

            // Assert - and the anonymous guest portal sees the same branding
            using var guestClient = _fixture.CreateTenantClient();
            guestClient.DefaultRequestHeaders.Add("x-tenant-code", tenant.TenantCode);

            using var publicBranding = await guestClient.GetAsync("/api/v1/settings/branding");
            Assert.Equal(HttpStatusCode.OK, publicBranding.StatusCode);

            var publicData = await ReadDataAsync(publicBranding);
            Assert.Equal(primaryColor, publicData.GetProperty("primaryColor").GetString());
        }

        [RequiresPostgresFact]
        public async Task BrandingUpdate_WithoutToken_IsRejectedAndLeavesSettingsUntouched()
        {
            // Arrange
            var tenant = await _fixture.ProvisionTenantAsync("tables");

            using var anonymous = _fixture.CreateTenantClient();
            anonymous.DefaultRequestHeaders.Add("x-tenant-code", tenant.TenantCode);

            using var response = await anonymous.PutAsJsonAsync("/api/v1/branding", new
            {
                branding = new { primaryColor = "#ffffff" }
            });

            // Assert - the write endpoint requires authentication, the read one does not
            Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);

            var storedBranding = _fixture.Server.QueryString(
                tenant.DatabaseName,
                "SELECT \"Value\" FROM settings WHERE \"Key\" = 'branding'");

            Assert.NotNull(storedBranding);
            Assert.DoesNotContain("#ffffff", storedBranding, StringComparison.OrdinalIgnoreCase);
        }

        [RequiresPostgresFact]
        public async Task TenantAdminChangePassword_EnforcesPolicyAndRotatesTheStoredHash()
        {
            // Arrange - a tenant of its own, because this test rotates the password
            var tenant = await _fixture.ProvisionTenantAsync("password");
            var token = await _fixture.GetTenantAdminTokenAsync(tenant);

            using var client = _fixture.CreateTenantClient(token);
            client.DefaultRequestHeaders.Add("x-tenant-code", tenant.TenantCode);

            var hashBefore = _fixture.Server.QueryString(
                tenant.DatabaseName,
                "SELECT \"PasswordHash\" FROM users WHERE \"UserId\" = 'tenant-admin-init'");

            // Act - a password that violates the platform policy
            using var weak = await PostJsonAsync(client, "/api/v1/auth/change-password", new { newPassword = "123456" });

            // Assert - rejected with the policy reason, and the stored hash is untouched
            Assert.Equal(HttpStatusCode.BadRequest, weak.StatusCode);

            var weakBody = await weak.Content.ReadFromJsonAsync<JsonElement>();
            Assert.Equal("WEAK_PASSWORD", weakBody.GetProperty("error").GetProperty("code").GetString());

            Assert.Equal(hashBefore, _fixture.Server.QueryString(
                tenant.DatabaseName,
                "SELECT \"PasswordHash\" FROM users WHERE \"UserId\" = 'tenant-admin-init'"));

            // Act - a compliant password
            using var strong = await PostJsonAsync(client, "/api/v1/auth/change-password", new { newPassword = NewTenantAdminPassword });

            // Assert - rotated in the database, stored as Argon2id, and the old
            // credential no longer verifies against the new hash
            Assert.Equal(HttpStatusCode.OK, strong.StatusCode);

            var hashAfter = _fixture.Server.QueryString(
                tenant.DatabaseName,
                "SELECT \"PasswordHash\" FROM users WHERE \"UserId\" = 'tenant-admin-init'");

            Assert.NotNull(hashAfter);
            Assert.StartsWith("$argon2id$", hashAfter);
            Assert.NotEqual(hashBefore, hashAfter);
            Assert.True(PasswordHasher.Verify(NewTenantAdminPassword, hashAfter));
            Assert.False(PasswordHasher.Verify(SiBangkuE2EFixture.TenantAdminPassword, hashAfter));

            // Assert - the forced rotation flag was cleared
            Assert.Equal("false", _fixture.Server.QueryString(
                tenant.DatabaseName,
                "SELECT \"MustChangePassword\"::text FROM users WHERE \"UserId\" = 'tenant-admin-init'"));

            // Assert - the new credential really signs in (one extra auth request)
            var (status, body) = await _fixture.TryTenantLoginAsync(tenant, NewTenantAdminPassword);
            Assert.Equal(HttpStatusCode.OK, status);

            using var document = JsonDocument.Parse(body);
            Assert.False(string.IsNullOrWhiteSpace(
                document.RootElement.GetProperty("data").GetProperty("token").GetString()));
        }

        /// <summary>Reads the current status of a reservation straight from PostgreSQL.</summary>
        private string? StatusOf(ProvisionedTenant tenant, string reservationId) =>
            _fixture.Server.QueryString(
                tenant.DatabaseName,
                "SELECT \"Status\" FROM reservations WHERE \"Id\" = @id",
                ("@id", reservationId));

        private static Task<HttpResponseMessage> PatchJsonAsync(HttpClient client, string path, object body) =>
            client.PatchAsync(path, JsonContent.Create(body));

        private static Task<HttpResponseMessage> PostJsonAsync(HttpClient client, string path, object body) =>
            client.PostAsJsonAsync(path, body);

        /// <summary>Books a table through the public guest endpoint.</summary>
        private static async Task<JsonElement> CreateReservationAsync(HttpClient client, int daysAhead, int guests)
        {
            var date = DateTime.UtcNow.Date.AddDays(daysAhead).ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);

            using var response = await client.PostAsJsonAsync("/api/v1/reservations", new
            {
                name = "Tamu Staff E2E",
                email = $"tamu-{Guid.NewGuid().ToString("N")[..8]}@e2e.sibangku.test",
                phone = "081234567891",
                date,
                startTime = "19:00",
                endTime = "20:00",
                guestCount = guests,
                notes = "End-to-end regression: staff operations"
            });

            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            return await ReadDataAsync(response);
        }

        private static async Task<JsonElement> ReadDataAsync(HttpResponseMessage response)
        {
            var body = await response.Content.ReadAsStringAsync();

            using var document = JsonDocument.Parse(body);
            return document.RootElement.Clone().GetProperty("data");
        }
    }
}
