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
using Xunit;

namespace SiBangku.Tests
{
    public class ControlApiIntegrationTests : IClassFixture<WebApplicationFactory<Program>>
    {
        private readonly WebApplicationFactory<Program> _factory;

        public ControlApiIntegrationTests(WebApplicationFactory<Program> factory)
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
    }
}
