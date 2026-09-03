using System;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using SiBangku.Db;
using SiBangku.Shared;
using SiBangku.Shared.Models;

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
            var temporaryPassword = !string.IsNullOrWhiteSpace(paramsDto.AdminPassword) && paramsDto.AdminPassword.Trim().Length >= 5
                ? paramsDto.AdminPassword.Trim()
                : Utils.GenerateTemporaryPassword();

            Console.WriteLine($"[Provisioner] Starting C# provisioning for {paramsDto.TenantName} (ID: {tenantId}, DB: {dbName})");

            // 2. Create the physical database on PostgreSQL server
            var controlBuilder = new NpgsqlConnectionStringBuilder(_controlDbConnectionString);
            var controlHost = controlBuilder.Host;
            var controlPort = controlBuilder.Port;
            var controlUser = controlBuilder.Username;
            var controlPassword = controlBuilder.Password;

            // Connect to postgres default DB to run CREATE DATABASE
            var systemBuilder = new NpgsqlConnectionStringBuilder
            {
                Host = controlHost,
                Port = controlPort,
                Username = controlUser,
                Password = controlPassword,
                Database = "postgres"
            };

            await using (var conn = new NpgsqlConnection(systemBuilder.ConnectionString))
            {
                await conn.OpenAsync();

                // Check if database exists
                var checkQuery = "SELECT 1 FROM pg_database WHERE datname = @dbName";
                await using (var checkCmd = new NpgsqlCommand(checkQuery, conn))
                {
                    checkCmd.Parameters.AddWithValue("dbName", dbName);
                    var exists = await checkCmd.ExecuteScalarAsync();

                    if (exists == null)
                    {
                        Console.WriteLine($"[Provisioner] Creating database \"{dbName}\"...");
                        // dbName is sanitized to a-z0-9_ so raw formatting is safe
                        var createQuery = $"CREATE DATABASE {dbName}";
                        await using (var createCmd = new NpgsqlCommand(createQuery, conn))
                        {
                            await createCmd.ExecuteNonQueryAsync();
                        }
                        Console.WriteLine($"[Provisioner] Database \"{dbName}\" created.");
                    }
                    else
                    {
                        Console.WriteLine($"[Provisioner] Database \"{dbName}\" already exists.");
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
                Console.WriteLine($"[Provisioner] Creating tables schema on \"{dbName}\"...");
                await tenantContext.Database.EnsureCreatedAsync();
                Console.WriteLine($"[Provisioner] Schema created successfully.");

                // 4. Seed initial Tenant Admin user
                var passwordHash = BCrypt.Net.BCrypt.HashPassword(temporaryPassword, 10);
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
                Console.WriteLine($"[Provisioner] Seeding completed for tenant owner admin and default tables.");
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
