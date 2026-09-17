using System;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Net.Http.Json;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using SiBangku.Db;
using Xunit;

namespace SiBangku.Tests
{
    public class ControlApiIntegrationTests : IClassFixture<WebApplicationFactory<SiBangku.ControlApi.Program>>
    {
        /// <summary>
        /// Master key used by the Development environment fallback. Production
        /// deployments must supply MASTER_API_KEY through configuration.
        /// </summary>
        private const string DevelopmentMasterKey = "dev-only-insecure-master-key";

        private readonly WebApplicationFactory<SiBangku.ControlApi.Program> _factory;

        public ControlApiIntegrationTests(WebApplicationFactory<SiBangku.ControlApi.Program> factory)
        {
            _factory = factory.WithWebHostBuilder(builder =>
            {
                builder.UseSetting("UseInMemoryDatabase", "true");
            });
        }

        [Fact]
        public async Task GetHealth_ShouldReturnOkAndServiceMetadata()
        {
            // Arrange
            var client = _factory.CreateClient();

            // Act
            var response = await client.GetAsync("/api/v1/health");

            // Assert
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);

            var content = await response.Content.ReadFromJsonAsync<JsonElement>();
            Assert.Equal("ok", content.GetProperty("status").GetString());
            Assert.Equal("control-api", content.GetProperty("service").GetString());
            Assert.True(content.TryGetProperty("version", out _));
        }

        [Fact]
        public async Task GetLiveness_ShouldReturnOk()
        {
            // Arrange
            var client = _factory.CreateClient();

            // Act
            var response = await client.GetAsync("/api/v1/liveness");

            // Assert
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);

            var content = await response.Content.ReadFromJsonAsync<JsonElement>();
            Assert.Equal("ok", content.GetProperty("status").GetString());
        }

        [Fact]
        public async Task GetReadiness_ShouldReturnOkAndChecks()
        {
            // Arrange
            var client = _factory.CreateClient();

            // Act
            var response = await client.GetAsync("/api/v1/readiness");

            // Assert
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);

            var content = await response.Content.ReadFromJsonAsync<JsonElement>();
            Assert.Equal("ok", content.GetProperty("status").GetString());
            Assert.True(content.TryGetProperty("checks", out _));
        }

        [Fact]
        public async Task NonExistentRoute_ShouldReturn404()
        {
            // Arrange
            var client = _factory.CreateClient();

            // Act
            var response = await client.GetAsync("/api/v1/nonexistent");

            // Assert
            Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        }

        [Fact]
        public async Task InternalAdminList_WithoutMasterKey_ShouldReturn403()
        {
            // Arrange
            var client = _factory.CreateClient();

            // Act
            var response = await client.GetAsync("/api/v1/internal/admin/list");

            // Assert
            Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        }

        [Fact]
        public async Task InternalAdminList_WithMasterKey_ShouldNeverExposePasswordHashes()
        {
            // Arrange
            var client = _factory.CreateClient();
            client.DefaultRequestHeaders.Add("X-Master-Key", DevelopmentMasterKey);

            // Act
            var response = await client.GetAsync("/api/v1/internal/admin/list");

            // Assert
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);

            var raw = await response.Content.ReadAsStringAsync();
            Assert.DoesNotContain("passwordHash", raw, StringComparison.OrdinalIgnoreCase);
            Assert.DoesNotContain("password_hash", raw, StringComparison.OrdinalIgnoreCase);
            Assert.DoesNotContain("$2", raw); // BCrypt hash prefix
        }

        [Fact]
        public async Task TenantStatusUpdate_WithoutToken_ShouldReturn401()
        {
            // Arrange
            var client = _factory.CreateClient();

            // Act
            var response = await client.PatchAsJsonAsync("/api/v1/tenants/does-not-exist/status", new { status = "ACTIVE" });

            // Assert - authorization is enforced server side, not by the UI.
            Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        }

        [Fact]
        public async Task TenantStatusUpdate_WithUnknownStatus_ShouldReturnBadRequest()
        {
            // Arrange - an arbitrary lifecycle state must never be accepted, even
            // by an authenticated Super Admin.
            var client = _factory.CreateClient();
            var token = await SignInAsSuperAdminAsync(client);
            client.DefaultRequestHeaders.Authorization =
                new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);

            // Act
            var response = await client.PatchAsJsonAsync("/api/v1/tenants/does-not-exist/status", new { status = "TOTALLY_MADE_UP" });

            // Assert - rejected by the status allowlist before any lookup happens.
            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        }

        private static async Task<string> SignInAsSuperAdminAsync(HttpClient client)
        {
            // The 'admin/admin' developer account is seeded in Development only.
            var response = await client.PostAsJsonAsync("/api/v1/auth/login", new { email = "admin", password = "admin" });
            response.EnsureSuccessStatusCode();

            var content = await response.Content.ReadFromJsonAsync<JsonElement>();
            return content.GetProperty("data").GetProperty("token").GetString()!;
        }

        [Fact]
        public async Task ProtectedTenantDirectory_WithoutToken_ShouldReturn401()
        {
            // Arrange
            var client = _factory.CreateClient();

            // Act
            var response = await client.GetAsync("/api/v1/tenants");

            // Assert
            Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        }

        [Fact]
        public async Task SecurityHeaders_ShouldBePresentOnApiResponses()
        {
            // Arrange
            var client = _factory.CreateClient();

            // Act
            var response = await client.GetAsync("/api/v1/health");

            // Assert
            Assert.True(response.Headers.Contains("X-Content-Type-Options"));
            Assert.True(response.Headers.Contains("X-Frame-Options"));
            Assert.True(response.Headers.Contains("Referrer-Policy"));
            Assert.Equal("nosniff", response.Headers.GetValues("X-Content-Type-Options").First());
        }
    }
}
