using System;
using System.Linq;
using System.Net;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Npgsql;
using SiBangku.Db;
using SiBangku.Shared;
using SiBangku.TenantApi.Services;
using SiBangku.Shared.Models;

namespace SiBangku.TenantApi.Middleware
{
    public class TenantResolutionMiddleware
    {
        private readonly RequestDelegate _next;
        private readonly string _controlDbConnectionString;
        private readonly bool _useInMemory;

        public TenantResolutionMiddleware(RequestDelegate next, IConfiguration configuration)
        {
            _next = next;
            _controlDbConnectionString = configuration["CONTROL_DATABASE_URL"] ??
                                         "Host=localhost;Database=sibangku_control;Username=sibangku;Password=sibangku_dev";
            _useInMemory = configuration["UseInMemoryDatabase"] == "true";
        }

        public async Task InvokeAsync(HttpContext context, ControlDbContext controlDb, TenantContext tenantContext)
        {
            // Bypass tenant checks for global health endpoints
            var path = context.Request.Path.Value?.ToLowerInvariant();
            if (path == "/api/v1/health" || path == "/api/v1/liveness" || path == "/api/v1/readiness")
            {
                await _next(context);
                return;
            }

            string? tenantId = context.Request.Headers["x-tenant-id"].FirstOrDefault();
            string? tenantCode = context.Request.Headers["x-tenant-code"].FirstOrDefault();

            // Subdomain resolution if no headers provided
            if (string.IsNullOrWhiteSpace(tenantId) && string.IsNullOrWhiteSpace(tenantCode))
            {
                var host = context.Request.Host.Host;
                var parts = host.Split('.');
                if (parts.Length > 1)
                {
                    var subdomain = parts[0].ToLowerInvariant();
                    if (!new[] { "www", "api", "control", "localhost" }.Contains(subdomain))
                    {
                        tenantCode = subdomain.ToUpperInvariant();
                    }
                }
            }

            Tenant? tenant = null;

            // Fetch tenant metadata from Control Plane
            if (!string.IsNullOrWhiteSpace(tenantId))
            {
                tenant = await controlDb.Tenants.FindAsync(tenantId);
            }
            else if (!string.IsNullOrWhiteSpace(tenantCode))
            {
                // Normalize code (remove dashes or compare strictly)
                tenant = await controlDb.Tenants.FirstOrDefaultAsync(t => t.TenantCode == tenantCode.ToUpperInvariant());
            }

            // Fallback default for local development if unresolved (PRD default)
            if (tenant == null)
            {
                tenant = await controlDb.Tenants.FirstOrDefaultAsync(t => t.TenantCode == "DISTRO-AVENUE");
            }

            if (tenant == null)
            {
                context.Response.StatusCode = 400;
                context.Response.ContentType = "application/json";
                await context.Response.WriteAsync(JsonSerializer.Serialize(new
                {
                    success = false,
                    error = new { code = "INVALID_TENANT", message = "Could not resolve active restaurant tenant." }
                }));
                return;
            }

            // PRD §101: Block requests if expired or suspended (allow branding settings lookups)
            var isSettingsBranding = path != null && path.EndsWith("/settings/branding");
            if (tenant.Status != "TRIAL" && tenant.Status != "ACTIVE" && !isSettingsBranding)
            {
                context.Response.StatusCode = 403;
                context.Response.ContentType = "application/json";
                await context.Response.WriteAsync(JsonSerializer.Serialize(new
                {
                    success = false,
                    error = new { code = "TENANT_EXPIRED", message = "Masa aktif layanan restoran ini telah berakhir atau ditangguhkan.", status = tenant.Status }
                }));
                return;
            }

            // Instantiation of the tenant dynamic connection context
            tenantContext.CurrentTenant = tenant;

            var optionsBuilder = new DbContextOptionsBuilder<TenantDbContext>();
            if (_useInMemory)
            {
                optionsBuilder.UseInMemoryDatabase(tenant.DatabaseIdentifier);
            }
            else
            {
                var controlBuilder = new NpgsqlConnectionStringBuilder(_controlDbConnectionString);
                var tenantBuilder = new NpgsqlConnectionStringBuilder
                {
                    Host = controlBuilder.Host,
                    Port = controlBuilder.Port,
                    Username = controlBuilder.Username,
                    Password = controlBuilder.Password,
                    Database = tenant.DatabaseIdentifier
                };
                optionsBuilder.UseNpgsql(tenantBuilder.ConnectionString);
            }

            tenantContext.DbContext = new TenantDbContext(optionsBuilder.Options);

            // Ensure tenant tables schema are created on local host
            // (For dynamic runtime db creations/migrations fail-safes)
            await tenantContext.DbContext.Database.EnsureCreatedAsync();

            try
            {
                await _next(context);
            }
            finally
            {
                // Dispose DB context pool handles at request teardown
                if (tenantContext.DbContext != null)
                {
                    await tenantContext.DbContext.DisposeAsync();
                }
            }
        }
    }
}
