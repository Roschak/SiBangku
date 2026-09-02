using System;
using System.Linq;
using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using SiBangku.Db;
using SiBangku.Shared.Models;
using Xunit;

namespace SiBangku.Tests
{
    public class TenantApiIntegrationTests : IClassFixture<WebApplicationFactory<SiBangku.TenantApi.Program>>
    {
        private readonly WebApplicationFactory<SiBangku.TenantApi.Program> _factory;

        public TenantApiIntegrationTests(WebApplicationFactory<SiBangku.TenantApi.Program> factory)
        {
            _factory = factory.WithWebHostBuilder(builder =>
            {
                builder.UseSetting("UseInMemoryDatabase", "true");
            });

            // Seed mockup tenant in in-memory ControlDbContext so middleware can resolve it
            using (var scope = _factory.Services.CreateScope())
            {
                var controlDb = scope.ServiceProvider.GetRequiredService<ControlDbContext>();
                
                var existing = controlDb.Tenants.FirstOrDefault(t => t.TenantCode == "DISTRO-AVENUE");
                if (existing == null)
                {
                    controlDb.Tenants.Add(new Tenant
                    {
                        TenantId = "tenant-test-id",
                        TenantCode = "DISTRO-AVENUE",
                        TenantName = "Distro Avenue",
                        RestaurantName = "Distro Resto",
                        Status = "ACTIVE",
                        DatabaseIdentifier = "tenant_distro_test_db",
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow
                    });
                    controlDb.SaveChanges();
                }
            }
        }

        [Fact]
        public async Task GetHealth_ShouldReturnOk()
        {
            // Arrange
            var client = _factory.CreateClient();

            // Act
            var response = await client.GetAsync("/api/v1/health");

            // Assert
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            
            var content = await response.Content.ReadFromJsonAsync<JsonElement>();
            Assert.Equal("ok", content.GetProperty("status").GetString());
            Assert.Equal("tenant-api", content.GetProperty("service").GetString());
        }

        [Fact]
        public async Task GetTables_ShouldSucceedWithMockTenant()
        {
            // Arrange
            var client = _factory.CreateClient();
            client.DefaultRequestHeaders.Add("x-tenant-code", "DISTRO-AVENUE");

            // Act
            var response = await client.GetAsync("/api/v1/tables");

            // Assert
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            
            var content = await response.Content.ReadFromJsonAsync<JsonElement>();
            Assert.True(content.GetProperty("success").GetBoolean());
            Assert.True(content.TryGetProperty("data", out _));
        }

        [Fact]
        public async Task GetTables_WithInvalidTenant_ShouldReturn400()
        {
            // Arrange
            var client = _factory.CreateClient();
            client.DefaultRequestHeaders.Add("x-tenant-code", "INVALID-CODE");

            // Act
            var response = await client.GetAsync("/api/v1/tables");

            // Assert
            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
            
            var content = await response.Content.ReadFromJsonAsync<JsonElement>();
            Assert.False(content.GetProperty("success").GetBoolean());
            Assert.Equal("INVALID_TENANT", content.GetProperty("error").GetProperty("code").GetString());
        }
    }
}
