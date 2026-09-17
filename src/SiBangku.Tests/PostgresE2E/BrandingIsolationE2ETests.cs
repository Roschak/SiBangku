using System;
using System.Net;
using System.Net.Http;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using Xunit;

namespace SiBangku.Tests.PostgresE2E
{
    /// <summary>
    /// End-to-end proof that branding and operating hours are isolated per tenant
    /// on a real PostgreSQL server: two tenants store different themes and
    /// opening hours, neither database ever receives the other's value, and a
    /// third tenant that was never written keeps the defaults it was provisioned
    /// with.
    /// <para>
    /// The tenants used here are the ones already provisioned for the other E2E
    /// classes ("tables", "isolation") plus a dedicated never-written tenant. This
    /// is deliberate: every extra tenant sign-in consumes one permit of the auth
    /// rate limit (10/minute), and this suite keeps that budget low.
    /// </para>
    /// </summary>
    [Collection(SiBangkuE2ECollection.Name)]
    public class BrandingIsolationE2ETests
    {
        private readonly SiBangkuE2EFixture _fixture;

        public BrandingIsolationE2ETests(SiBangkuE2EFixture fixture)
        {
            _fixture = fixture;
        }

        [RequiresPostgresFact]
        public async Task Branding_AndTimeSlots_AreIsolatedPerTenant()
        {
            // Arrange - two tenants that store their own theme and opening hours,
            // plus a third that is never written to.
            var tenantA = await _fixture.ProvisionTenantAsync("tables");
            var tenantB = await _fixture.ProvisionTenantAsync("isolation");
            var untouchedTenant = await _fixture.ProvisionTenantAsync("branding-default");

            var colorA = RandomColor();
            var colorB = RandomColor();

            // Act
            await SaveBrandingAsync(tenantA, await _fixture.GetTenantAdminTokenAsync(tenantA), new
            {
                branding = new { primaryColor = colorA, secondaryColor = "#1a1a1a", font = "Inter", logo = "", favicon = "", heroImage = "" },
                timeSlots = new { slotDuration = 30, maxConcurrentCovers = 20, openingTime = "08:15", closingTime = "22:45" }
            });

            await SaveBrandingAsync(tenantB, await _fixture.GetTenantAdminTokenAsync(tenantB), new
            {
                branding = new { primaryColor = colorB, secondaryColor = "#2b2b2b", font = "Roboto", logo = "", favicon = "", heroImage = "" },
                timeSlots = new { slotDuration = 90, maxConcurrentCovers = 8, openingTime = "11:00", closingTime = "23:30" }
            });

            // Assert - each tenant reads back its own values through the public API
            var brandingA = await GetDataAsync(tenantA, "/api/v1/settings/branding");
            var brandingB = await GetDataAsync(tenantB, "/api/v1/settings/branding");

            Assert.Equal(colorA, brandingA.GetProperty("primaryColor").GetString());
            Assert.Equal(colorB, brandingB.GetProperty("primaryColor").GetString());

            var compositeA = await GetDataAsync(tenantA, "/api/v1/branding");
            Assert.Equal(colorA, compositeA.GetProperty("branding").GetProperty("primaryColor").GetString());
            Assert.Equal(30, compositeA.GetProperty("timeSlots").GetProperty("slotDuration").GetInt32());
            Assert.Equal("08:15", compositeA.GetProperty("timeSlots").GetProperty("openingTime").GetString());
            Assert.Equal(tenantA.TenantCode, compositeA.GetProperty("tenant").GetProperty("tenantCode").GetString());

            var compositeB = await GetDataAsync(tenantB, "/api/v1/branding");
            Assert.Equal(colorB, compositeB.GetProperty("branding").GetProperty("primaryColor").GetString());
            Assert.Equal(90, compositeB.GetProperty("timeSlots").GetProperty("slotDuration").GetInt32());
            Assert.Equal("11:00", compositeB.GetProperty("timeSlots").GetProperty("openingTime").GetString());

            var slotsA = await GetDataAsync(tenantA, "/api/v1/settings/time_slots");
            var slotsB = await GetDataAsync(tenantB, "/api/v1/settings/time_slots");
            Assert.Equal(30, slotsA.GetProperty("slotDuration").GetInt32());
            Assert.Equal(90, slotsB.GetProperty("slotDuration").GetInt32());

            // Assert - the rows live in separate databases and never carry the
            // other tenant's value.
            var storedBrandingA = StoredSetting(tenantA, "branding");
            var storedBrandingB = StoredSetting(tenantB, "branding");

            Assert.Contains(colorA, storedBrandingA, StringComparison.OrdinalIgnoreCase);
            Assert.DoesNotContain(colorB, storedBrandingA, StringComparison.OrdinalIgnoreCase);
            Assert.Contains(colorB, storedBrandingB, StringComparison.OrdinalIgnoreCase);
            Assert.DoesNotContain(colorA, storedBrandingB, StringComparison.OrdinalIgnoreCase);

            var storedSlotsA = StoredSetting(tenantA, "time_slots");
            var storedSlotsB = StoredSetting(tenantB, "time_slots");

            Assert.Contains("08:15", storedSlotsA, StringComparison.Ordinal);
            Assert.DoesNotContain("11:00", storedSlotsA, StringComparison.Ordinal);
            Assert.Contains("11:00", storedSlotsB, StringComparison.Ordinal);
            Assert.DoesNotContain("08:15", storedSlotsB, StringComparison.Ordinal);

            // Assert - writing to A and B did not touch a tenant that was never
            // written to: it still serves the values the provisioner seeded.
            var untouchedBranding = await GetDataAsync(untouchedTenant, "/api/v1/settings/branding");
            var untouchedSlots = await GetDataAsync(untouchedTenant, "/api/v1/settings/time_slots");

            Assert.Equal("#3b82f6", untouchedBranding.GetProperty("primaryColor").GetString());
            Assert.Equal(60, untouchedSlots.GetProperty("slotDuration").GetInt32());
            Assert.DoesNotContain(colorA, StoredSetting(untouchedTenant, "branding"), StringComparison.OrdinalIgnoreCase);
            Assert.DoesNotContain(colorB, StoredSetting(untouchedTenant, "branding"), StringComparison.OrdinalIgnoreCase);
        }

        [RequiresPostgresFact]
        public async Task Branding_CrossTenantWriteWithForeignToken_IsForbidden()
        {
            // Arrange - a valid tenant admin token, but for a different tenant
            var tenantA = await _fixture.ProvisionTenantAsync("tables");
            var tenantB = await _fixture.ProvisionTenantAsync("isolation");
            var tokenB = await _fixture.GetTenantAdminTokenAsync(tenantB);

            var brandingBefore = StoredSetting(tenantB, "branding");
            var slotsBefore = StoredSetting(tenantB, "time_slots");

            using var client = _fixture.CreateTenantClient(tokenB);
            client.DefaultRequestHeaders.Add("x-tenant-code", tenantA.TenantCode);

            // Act - every settings write path, with the wrong tenant's token
            using var putBranding = await client.PutAsJsonAsync("/api/v1/branding", new
            {
                branding = new { primaryColor = "#abcdef" }
            });

            using var postBranding = await client.PostAsync(
                "/api/v1/settings/branding",
                JsonContent.Create(new { primaryColor = "#abcdef" }));

            using var postTimeSlots = await client.PostAsync(
                "/api/v1/settings/time_slots",
                JsonContent.Create(new { slotDuration = 5 }));

            // Assert - the TenantId claim is compared with the resolved tenant
            foreach (var response in new[] { putBranding, postBranding, postTimeSlots })
            {
                Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);

                var body = await response.Content.ReadFromJsonAsync<JsonElement>();
                Assert.Equal("FORBIDDEN", body.GetProperty("error").GetProperty("code").GetString());
            }

            // Assert - nothing was written into the other tenant's database
            Assert.Equal(brandingBefore, StoredSetting(tenantB, "branding"));
            Assert.Equal(slotsBefore, StoredSetting(tenantB, "time_slots"));
        }

        [RequiresPostgresFact]
        public async Task Branding_LegacySettingsEndpoints_WriteOnlyToTheirOwnTenant()
        {
            // Arrange
            var tenantA = await _fixture.ProvisionTenantAsync("tables");
            var tenantB = await _fixture.ProvisionTenantAsync("isolation");
            var tokenA = await _fixture.GetTenantAdminTokenAsync(tenantA);

            var colorA = RandomColor();
            var brandingBeforeB = StoredSetting(tenantB, "branding");
            var slotsBeforeB = StoredSetting(tenantB, "time_slots");

            using var client = _fixture.CreateTenantClient(tokenA);
            client.DefaultRequestHeaders.Add("x-tenant-code", tenantA.TenantCode);

            // Act - the per-setting endpoints take the raw JSON body
            using var brandingResponse = await client.PostAsync(
                "/api/v1/settings/branding",
                JsonContent.Create(new
                {
                    primaryColor = colorA,
                    secondaryColor = "#333333",
                    font = "Inter",
                    logo = "",
                    favicon = "",
                    heroImage = ""
                }));

            using var timeSlotsResponse = await client.PostAsync(
                "/api/v1/settings/time_slots",
                JsonContent.Create(new
                {
                    slotDuration = 15,
                    maxConcurrentCovers = 8,
                    openingTime = "07:00",
                    closingTime = "23:59"
                }));

            // Assert - accepted and stored for the tenant that sent it
            Assert.Equal(HttpStatusCode.OK, brandingResponse.StatusCode);
            Assert.Equal(HttpStatusCode.OK, timeSlotsResponse.StatusCode);

            Assert.Contains(colorA, StoredSetting(tenantA, "branding"), StringComparison.OrdinalIgnoreCase);
            Assert.Contains("07:00", StoredSetting(tenantA, "time_slots"), StringComparison.Ordinal);

            Assert.Equal(15, (await GetDataAsync(tenantA, "/api/v1/settings/time_slots"))
                .GetProperty("slotDuration").GetInt32());

            // Assert - the other tenant keeps its own stored settings...
            Assert.Equal(brandingBeforeB, StoredSetting(tenantB, "branding"));
            Assert.Equal(slotsBeforeB, StoredSetting(tenantB, "time_slots"));

            // ...and never sees the value written by its neighbour
            var publicBrandingB = await GetDataAsync(tenantB, "/api/v1/settings/branding");
            Assert.DoesNotContain(colorA, publicBrandingB.GetRawText(), StringComparison.OrdinalIgnoreCase);
        }

        [RequiresPostgresFact]
        public async Task Branding_MalformedBody_IsRejectedWithoutCorruptingStoredSettings()
        {
            // Regression: a body that is not a JSON object used to be persisted
            // before validation, which both returned 500 and left the tenant with a
            // corrupt settings row - breaking the public booking portal (every page
            // load parses this value) until it was repaired by hand.
            var tenant = await _fixture.ProvisionTenantAsync("tables");
            var token = await _fixture.GetTenantAdminTokenAsync(tenant);

            var brandingBefore = StoredSetting(tenant, "branding");
            var slotsBefore = StoredSetting(tenant, "time_slots");

            using var client = _fixture.CreateTenantClient(token);
            client.DefaultRequestHeaders.Add("x-tenant-code", tenant.TenantCode);

            // Act - malformed JSON, a valid non-object, and an oversized payload
            using var malformed = await client.PostAsync(
                "/api/v1/settings/branding",
                new StringContent("{ not-valid-json", Encoding.UTF8, "application/json"));

            using var notAnObject = await client.PostAsync(
                "/api/v1/settings/time_slots",
                new StringContent("\"08:00\"", Encoding.UTF8, "application/json"));

            using var oversized = await client.PostAsync(
                "/api/v1/settings/branding",
                new StringContent(
                    $"{{\"heroImage\":\"{new string('a', 20_000)}\"}}",
                    Encoding.UTF8,
                    "application/json"));

            using var putMalformed = await client.PutAsync(
                "/api/v1/branding",
                new StringContent("{ oops", Encoding.UTF8, "application/json"));

            // Assert - all four rejected as client errors, never as a 500
            Assert.Equal(HttpStatusCode.BadRequest, malformed.StatusCode);
            Assert.Equal(HttpStatusCode.BadRequest, notAnObject.StatusCode);
            Assert.Equal(HttpStatusCode.RequestEntityTooLarge, oversized.StatusCode);
            Assert.Equal(HttpStatusCode.BadRequest, putMalformed.StatusCode);

            // Assert - nothing was persisted, so the stored settings are untouched
            Assert.Equal(brandingBefore, StoredSetting(tenant, "branding"));
            Assert.Equal(slotsBefore, StoredSetting(tenant, "time_slots"));

            // Assert - and the public portal still serves its branding (no 500)
            var publicBranding = await GetDataAsync(tenant, "/api/v1/settings/branding");
            Assert.Equal(brandingBefore, publicBranding.GetRawText());
        }

        [RequiresPostgresFact]
        public async Task Branding_CorruptStoredRow_DegradesToDefaultsInsteadOfBreakingThePortal()
        {
            // A settings row that is unreadable - written by an older deployment
            // before bodies were validated, or edited by hand in the database - must
            // not take the tenant's public portal down. The endpoints serve the
            // platform defaults instead of raising a 500 on every page load.
            //
            // The dedicated tenant keeps this scenario away from the tenants the
            // other E2E classes write to.
            var tenant = await _fixture.ProvisionTenantAsync("branding-corrupt");

            // Act - a stored value that is not JSON at all
            _fixture.Server.Execute(
                tenant.DatabaseName,
                "UPDATE settings SET \"Value\" = @value WHERE \"Key\" = 'branding'",
                ("@value", "{ not-valid-json"));

            // Assert - the settings endpoint and the portals' composite endpoint
            // both answer with the defaults instead of failing
            var branding = await GetDataAsync(tenant, "/api/v1/settings/branding");
            Assert.Equal("#3b82f6", branding.GetProperty("primaryColor").GetString());

            var composite = await GetDataAsync(tenant, "/api/v1/branding");
            Assert.Equal("#D4AF37", composite.GetProperty("branding").GetProperty("primaryColor").GetString());
            Assert.Equal(60, composite.GetProperty("timeSlots").GetProperty("slotDuration").GetInt32());

            // Act - a value that is valid JSON but not an object
            _fixture.Server.Execute(
                tenant.DatabaseName,
                "UPDATE settings SET \"Value\" = @value WHERE \"Key\" = 'time_slots'",
                ("@value", "\"08:00\""));

            // Assert
            var timeSlots = await GetDataAsync(tenant, "/api/v1/settings/time_slots");
            Assert.Equal(60, timeSlots.GetProperty("slotDuration").GetInt32());
            Assert.Equal("08:00", timeSlots.GetProperty("openingTime").GetString());
        }

        private async Task SaveBrandingAsync(ProvisionedTenant tenant, string token, object payload)
        {
            using var client = _fixture.CreateTenantClient(token);
            client.DefaultRequestHeaders.Add("x-tenant-code", tenant.TenantCode);

            using var response = await client.PutAsJsonAsync("/api/v1/branding", payload);
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        }

        /// <summary>Reads a public settings endpoint for one tenant and unwraps `data`.</summary>
        private async Task<JsonElement> GetDataAsync(ProvisionedTenant tenant, string path)
        {
            using var client = _fixture.CreateTenantClient();
            client.DefaultRequestHeaders.Add("x-tenant-code", tenant.TenantCode);

            using var response = await client.GetAsync(path);
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);

            var body = await response.Content.ReadAsStringAsync();
            using var document = JsonDocument.Parse(body);
            return document.RootElement.Clone().GetProperty("data");
        }

        private string StoredSetting(ProvisionedTenant tenant, string key) =>
            _fixture.Server.QueryString(
                tenant.DatabaseName,
                "SELECT \"Value\" FROM settings WHERE \"Key\" = @key",
                ("@key", key)) ?? string.Empty;

        private static string RandomColor() => "#" + Guid.NewGuid().ToString("N")[..6];
    }
}
