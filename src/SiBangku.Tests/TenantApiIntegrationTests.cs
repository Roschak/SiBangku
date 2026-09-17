using System;
using System.Linq;
using System.Net;
using System.Net.Http.Json;
using System.Text;
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
        private const string TenantCode = "DISTRO-AVENUE";
        private const string TenantDatabase = "tenant_distro_test_db";

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

                var existing = controlDb.Tenants.FirstOrDefault(t => t.TenantCode == TenantCode);
                if (existing == null)
                {
                    controlDb.Tenants.Add(new Tenant
                    {
                        TenantId = "tenant-test-id",
                        TenantCode = TenantCode,
                        TenantName = "Distro Avenue",
                        RestaurantName = "Distro Resto",
                        Status = "ACTIVE",
                        DatabaseIdentifier = TenantDatabase,
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow
                    });
                    controlDb.SaveChanges();
                }
            }
        }

        /// <summary>
        /// Seeds one bookable table into the tenant's in-memory database so the
        /// reservation auto-assignment path has somewhere to place a guest.
        /// </summary>
        private static void SeedBookableTable()
        {
            var options = new DbContextOptionsBuilder<TenantDbContext>()
                .UseInMemoryDatabase(TenantDatabase)
                .Options;

            using var db = new TenantDbContext(options);
            if (!db.Tables.Any(t => t.TableId == "tbl-e2e-1"))
            {
                db.Tables.Add(new Table
                {
                    TableId = "tbl-e2e-1",
                    TableNumber = "E2E-1",
                    Shape = "SQUARE",
                    Capacity = 8,
                    PosX = 0,
                    PosY = 0,
                    Rotation = 0,
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow
                });
                db.SaveChanges();
            }
        }

        private static string FutureDate(int daysAhead) =>
            DateTime.UtcNow.Date.AddDays(daysAhead).ToString("yyyy-MM-dd");

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
            client.DefaultRequestHeaders.Add("x-tenant-code", TenantCode);

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

        [Fact]
        public async Task GetReservations_WithDateFilter_ShouldReturnOk()
        {
            // Arrange
            var client = _factory.CreateClient();
            client.DefaultRequestHeaders.Add("x-tenant-code", TenantCode);

            // Act
            var response = await client.GetAsync($"/api/v1/reservations?date={FutureDate(5)}");

            // Assert
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            var content = await response.Content.ReadFromJsonAsync<JsonElement>();
            Assert.True(content.GetProperty("success").GetBoolean());
        }

        [Fact]
        public async Task PostReservation_WithLegacyGuestAliasPayload_ShouldSucceed()
        {
            // Arrange - the field shape the booking form historically posted.
            SeedBookableTable();
            var client = _factory.CreateClient();
            client.DefaultRequestHeaders.Add("x-tenant-code", TenantCode);

            var payload = new
            {
                guestName = "Budi Santoso",
                guestEmail = "budi.alias@example.com",
                guestPhone = "081234567890",
                date = FutureDate(7),
                startTime = "12:00",
                endTime = "13:00",
                guestCount = 2,
                notes = "Regression: legacy alias payload"
            };

            // Act
            var response = await client.PostAsJsonAsync("/api/v1/reservations", payload);

            // Assert
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            var content = await response.Content.ReadFromJsonAsync<JsonElement>();
            Assert.True(content.GetProperty("success").GetBoolean());
            Assert.True(content.TryGetProperty("data", out _));
        }

        [Fact]
        public async Task PostReservation_WithCanonicalPayload_ShouldStoreUtcDate()
        {
            // Arrange
            SeedBookableTable();
            var client = _factory.CreateClient();
            client.DefaultRequestHeaders.Add("x-tenant-code", TenantCode);

            var payload = new
            {
                name = "Siti Aminah",
                email = "siti.canonical@example.com",
                phone = "081298765432",
                date = FutureDate(9),
                startTime = "18:00",
                endTime = "19:30",
                guestCount = 4,
                notes = "Regression: canonical payload"
            };

            // Act
            var response = await client.PostAsJsonAsync("/api/v1/reservations", payload);

            // Assert
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            var content = await response.Content.ReadFromJsonAsync<JsonElement>();
            var data = content.GetProperty("data");

            // PostgreSQL timestamptz only accepts Kind=Utc values; an Unspecified
            // DateTime here means the API would fail against a real database.
            Assert.Equal(DateTimeKind.Utc, data.GetProperty("date").GetDateTime().Kind);
        }

        [Fact]
        public async Task PostReservation_WithInvalidGuestCount_ShouldReturnBadRequest()
        {
            // Arrange
            SeedBookableTable();
            var client = _factory.CreateClient();
            client.DefaultRequestHeaders.Add("x-tenant-code", TenantCode);

            var payload = new
            {
                name = "Terlalu Ramai",
                email = "ramai@example.com",
                phone = "081200000000",
                date = FutureDate(11),
                startTime = "10:00",
                endTime = "11:00",
                guestCount = 999,
                notes = "Too many guests"
            };

            // Act
            var response = await client.PostAsJsonAsync("/api/v1/reservations", payload);

            // Assert
            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        }

        [Fact]
        public async Task PostReservation_WithMalformedBody_ShouldReturnBadRequest()
        {
            // Arrange
            var client = _factory.CreateClient();
            client.DefaultRequestHeaders.Add("x-tenant-code", TenantCode);

            // Act
            var response = await client.PostAsync(
                "/api/v1/reservations",
                new StringContent("{ not-valid-json", Encoding.UTF8, "application/json"));

            // Assert - a malformed body must never surface as an unhandled 500.
            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        }
    }
}
