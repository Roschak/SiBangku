using System;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using SiBangku.Db;
using SiBangku.Shared;
using SiBangku.Shared.Models;
using SiBangku.Shared.Security;

namespace SiBangku.ControlApi.Services
{
    public interface ITenantProvisioner
    {
        Task<ProvisionResult> ProvisionTenantAsync(ProvisionTenantParams paramsDto);
    }

    public class ProvisionTenantParams
    {
        public string TenantName { get; set; } = string.Empty;
        public string RestaurantName { get; set; } = string.Empty;
        public string AdminEmail { get; set; } = string.Empty;
        public string? AdminPassword { get; set; }
        public int TrialDays { get; set; } = 60;
    }

    public class ProvisionResult
    {
        public string TenantId { get; set; } = string.Empty;
        public string TenantCode { get; set; } = string.Empty;
        public string AdminEmail { get; set; } = string.Empty;
        public string TemporaryPassword { get; set; } = string.Empty;
        public string DatabaseName { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
    }

    public class TenantProvisioner : ITenantProvisioner
    {
        private readonly ControlDbContext _controlContext;
        private readonly string _controlDbConnectionString;

        public TenantProvisioner(ControlDbContext controlContext, string controlDbConnectionString)
        {
            _controlContext = controlContext;
            _controlDbConnectionString = controlDbConnectionString;
        }

        public async Task<ProvisionResult> ProvisionTenantAsync(ProvisionTenantParams paramsDto)
        {
            // 1. Generate unique identifiers
            var tenantId = Utils.GenerateTenantId();
            var tenantSlug = Utils.GenerateTenantSlug(paramsDto.TenantName);
            var tenantCode = tenantSlug.ToUpperInvariant();
            var dbName = Utils.GenerateDatabaseIdentifier(tenantSlug);
            var packageId = Utils.GeneratePackageId(tenantSlug);
            var webIdentifier = $"{tenantSlug}.sibangku.example";
            var apkIdentifier = packageId;
            // An operator-supplied password must satisfy the platform password
            // policy; the auto-generated fallback is high-entropy by construction.
            string temporaryPassword;
            if (!string.IsNullOrWhiteSpace(paramsDto.AdminPassword))
            {
                var supplied = paramsDto.AdminPassword.Trim();
                var policyResult = PasswordPolicy.Validate(supplied, paramsDto.AdminEmail);
                if (!policyResult.IsValid)
                {
                    throw new ArgumentException(policyResult.ErrorSummary, nameof(paramsDto));
                }

                temporaryPassword = supplied;
            }
            else
            {
                temporaryPassword = Utils.GenerateTemporaryPassword();
            }

            // provisioning step

            // 2. Create the physical database on PostgreSQL server
            var controlBuilder = new NpgsqlConnectionStringBuilder(_controlDbConnectionString);
            var controlHost = controlBuilder.Host;
            var controlPort = controlBuilder.Port;
            var controlUser = controlBuilder.Username;
            var controlPassword = controlBuilder.Password;

            // Connect to maintenance DB (control DB first, fallback to postgres) to run CREATE DATABASE
            var maintenanceDb = !string.IsNullOrWhiteSpace(controlBuilder.Database) ? controlBuilder.Database : "postgres";
            var systemBuilder = new NpgsqlConnectionStringBuilder
            {
                Host = controlHost,
                Port = controlPort,
                Username = controlUser,
                Password = controlPassword,
                Database = maintenanceDb
            };

            NpgsqlConnection? conn = null;
            try
            {
                conn = new NpgsqlConnection(systemBuilder.ConnectionString);
                await conn.OpenAsync();
            }
            catch
            {
                systemBuilder.Database = "postgres";
                conn = new NpgsqlConnection(systemBuilder.ConnectionString);
                await conn.OpenAsync();
            }

            await using (conn)
            {
                // Check if database exists
                var checkQuery = "SELECT 1 FROM pg_database WHERE datname = @dbName";
                await using (var checkCmd = new NpgsqlCommand(checkQuery, conn))
                {
                    checkCmd.Parameters.AddWithValue("dbName", dbName);
                    var exists = await checkCmd.ExecuteScalarAsync();

                    if (exists == null)
                    {
                        var createQuery = $"CREATE DATABASE \"{dbName}\"";
                        await using (var createCmd = new NpgsqlCommand(createQuery, conn))
                        {
                            await createCmd.ExecuteNonQueryAsync();
                        }
                    }
                }
            }

            // 3. Connect to newly created database and run schema generation
            var tenantBuilder = new NpgsqlConnectionStringBuilder
            {
                Host = controlHost,
                Port = controlPort,
                Username = controlUser,
                Password = controlPassword,
                Database = dbName
            };

            var optionsBuilder = new DbContextOptionsBuilder<TenantDbContext>();
            optionsBuilder.UseNpgsql(tenantBuilder.ConnectionString);

            using (var tenantContext = new TenantDbContext(optionsBuilder.Options))
            {
                // provisioning step
                await tenantContext.Database.EnsureCreatedAsync();
                // provisioning step

                // 4. Seed initial Tenant Admin user
                var passwordHash = PasswordHasher.Hash(temporaryPassword);
                var tenantAdmin = new User
                {
                    UserId = "tenant-admin-init",
                    TenantId = tenantId,
                    Email = paramsDto.AdminEmail,
                    PasswordHash = passwordHash,
                    Name = "Restaurant Owner",
                    Role = "TENANT_ADMIN",
                    MustChangePassword = true,
                    CreatedAt = DateTime.UtcNow
                };

                await tenantContext.Users.AddAsync(tenantAdmin);

                // Seed dynamic setting profiles (PRD §21-22)
                var brandingSetting = new Setting
                {
                    Key = "branding",
                    Value = "{\"primaryColor\":\"#3b82f6\",\"secondaryColor\":\"#1e3a8a\",\"font\":\"Inter\",\"logo\":\"\",\"favicon\":\"\",\"heroImage\":\"\"}"
                };

                var slotsSetting = new Setting
                {
                    Key = "time_slots",
                    Value = "{\"slotDuration\":60,\"maxConcurrentCovers\":30,\"openingTime\":\"08:00\",\"closingTime\":\"22:00\"}"
                };

                // Seed default tables for visual layout
                var defaultTables = new System.Collections.Generic.List<Table>
                {
                    new Table { TableId = $"tbl-1-{tenantId}", TableNumber = "1", Shape = "SQUARE", Capacity = 2, PosX = 80, PosY = 60, Rotation = 0, IsActive = true, CreatedAt = DateTime.UtcNow },
                    new Table { TableId = $"tbl-2-{tenantId}", TableNumber = "2", Shape = "SQUARE", Capacity = 4, PosX = 280, PosY = 60, Rotation = 0, IsActive = true, CreatedAt = DateTime.UtcNow },
                    new Table { TableId = $"tbl-3-{tenantId}", TableNumber = "3", Shape = "ROUND", Capacity = 4, PosX = 80, PosY = 220, Rotation = 0, IsActive = true, CreatedAt = DateTime.UtcNow },
                    new Table { TableId = $"tbl-4-{tenantId}", TableNumber = "4", Shape = "RECTANGLE", Capacity = 6, PosX = 280, PosY = 220, Rotation = 0, IsActive = true, CreatedAt = DateTime.UtcNow }
                };

                await tenantContext.Settings.AddRangeAsync(brandingSetting, slotsSetting);
                await tenantContext.Tables.AddRangeAsync(defaultTables);
                await tenantContext.SaveChangesAsync();
                // provisioning step
            }

            // 5. Save tenant record and log audit details in Control Plane
            var now = DateTime.UtcNow;
            var tenant = new Tenant
            {
                TenantId = tenantId,
                TenantCode = tenantCode,
                TenantName = paramsDto.TenantName,
                RestaurantName = paramsDto.RestaurantName,
                Status = "TRIAL",
                SubscriptionStatus = "TRIAL",
                TrialStart = now,
                TrialEnd = now.AddDays(paramsDto.TrialDays),
                DatabaseIdentifier = dbName,
                StorageIdentifier = $"storage_{tenantSlug}",
                WebIdentifier = webIdentifier,
                ApkIdentifier = apkIdentifier,
                CreatedAt = now,
                UpdatedAt = now
            };

            await _controlContext.Tenants.AddAsync(tenant);

            var audit = new AuditLog
            {
                Id = $"aud-{Guid.NewGuid():N}",
                TenantId = tenantId,
                Action = "provision tenant",
                UserId = "system-api",
                Details = $"{{\"provisionedAt\":\"{now:O}\",\"database\":\"{dbName}\",\"admin\":\"{paramsDto.AdminEmail}\",\"trialDays\":{paramsDto.TrialDays}}}",
                CreatedAt = now
            };

            await _controlContext.AuditLogs.AddAsync(audit);
            await _controlContext.SaveChangesAsync();

            // Automatically scaffold tenant workspace files (desktop bat, web launcher, android project, config)
            TenantWorkspaceScaffolder.ScaffoldWorkspace(
                tenantCode,
                paramsDto.RestaurantName,
                tenantId,
                paramsDto.TenantName,
                dbName);

            return new ProvisionResult
            {
                TenantId = tenantId,
                TenantCode = tenantCode,
                AdminEmail = paramsDto.AdminEmail,
                TemporaryPassword = temporaryPassword,
                DatabaseName = dbName,
                Status = "TRIAL"
            };
        }
    }
}
