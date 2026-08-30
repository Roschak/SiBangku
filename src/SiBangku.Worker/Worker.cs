using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Npgsql;
using SiBangku.Db;
using SiBangku.Shared.Models;

namespace SiBangku.Worker
{
    public class Worker : BackgroundService
    {
        private readonly ILogger<Worker> _logger;
        private readonly IServiceProvider _serviceProvider;
        private readonly string _controlDbConnectionString;
        private readonly int _checkIntervalSeconds;

        public Worker(ILogger<Worker> logger, IServiceProvider serviceProvider, IConfiguration configuration)
        {
            _logger = logger;
            _serviceProvider = serviceProvider;
            _controlDbConnectionString = configuration["CONTROL_DATABASE_URL"] ??
                                         "Host=localhost;Database=sibangku_control;Username=sibangku;Password=sibangku_dev";
            // Allow configurable intervals for tests, default to 60 seconds
            _checkIntervalSeconds = int.TryParse(configuration["WorkerCheckIntervalSeconds"], out var val) ? val : 60;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("Background Worker started with check interval of {interval} seconds.", _checkIntervalSeconds);

            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    _logger.LogInformation("Worker starting job execution cycles...");
                    await ProcessJobsAsync();
                    _logger.LogInformation("Worker execution cycle finished.");
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "An error occurred in the background worker execution cycle.");
                }

                await Task.Delay(TimeSpan.FromSeconds(_checkIntervalSeconds), stoppingToken);
            }
        }

        private async Task ProcessJobsAsync()
        {
            using (var scope = _serviceProvider.CreateScope())
            {
                var controlDb = scope.ServiceProvider.GetRequiredService<ControlDbContext>();
                var now = DateTime.UtcNow;

                // ==========================================
                // JOB 1: Check Tenant Trial Expirations (PRD §5)
                // ==========================================
                var expiredTrialTenants = await controlDb.Tenants
                    .Where(t => t.Status == "TRIAL" && t.TrialEnd < now)
                    .ToListAsync();

                foreach (var tenant in expiredTrialTenants)
                {
                    tenant.Status = "TRIAL_EXPIRED";
                    tenant.UpdatedAt = now;

                    var audit = new AuditLog
                    {
                        Id = $"audit-worker-trial-{tenant.TenantId}-{now.Ticks}",
                        TenantId = tenant.TenantId,
                        Action = "trial expired",
                        UserId = "background-worker",
                        Details = $"{{\"expiredAt\":\"{tenant.TrialEnd:O}\",\"processedAt\":\"{now:O}\"}}",
                        CreatedAt = now
                    };

                    await controlDb.AuditLogs.AddAsync(audit);
                    _logger.LogWarning("Tenant '{tenantName}' (ID: {tenantId}) trial expired on {trialEnd}.", 
                        tenant.TenantName, tenant.TenantId, tenant.TrialEnd);
                }

                await controlDb.SaveChangesAsync();

                // ==========================================
                // JOB 2: Check Active Tenant Reservation Expirations
                // ==========================================
                var activeTenants = await controlDb.Tenants
                    .Where(t => t.Status == "TRIAL" || t.Status == "ACTIVE")
                    .ToListAsync();

                var controlBuilder = new NpgsqlConnectionStringBuilder(_controlDbConnectionString);

                foreach (var tenant in activeTenants)
                {
                    try
                    {
                        // Build connection string for individual tenant DB
                        var tenantBuilder = new NpgsqlConnectionStringBuilder
                        {
                            Host = controlBuilder.Host,
                            Port = controlBuilder.Port,
                            Username = controlBuilder.Username,
                            Password = controlBuilder.Password,
                            Database = tenant.DatabaseIdentifier
                        };

                        var optionsBuilder = new DbContextOptionsBuilder<TenantDbContext>();
                        optionsBuilder.UseNpgsql(tenantBuilder.ConnectionString);

                        using (var tenantDb = new TenantDbContext(optionsBuilder.Options))
                        {
                            // Ensure database is online/reachable before querying
                            if (!await tenantDb.Database.CanConnectAsync())
                            {
                                _logger.LogWarning("Database '{dbName}' for tenant '{tenantName}' is not reachable. Skipping.", 
                                    tenant.DatabaseIdentifier, tenant.TenantName);
                                continue;
                            }

                            // 2a. Cancel unpaid pending reservations after 15 minutes payment timeout (PRD §5)
                            var unpaidTimeout = now.AddMinutes(-15);
                            var unpaidReservations = await tenantDb.Reservations
                                .Where(r => r.PaymentStatus == "UNPAID" && r.Status == "PENDING" && r.CreatedAt < unpaidTimeout)
                                .ToListAsync();

                            foreach (var rsv in unpaidReservations)
                            {
                                rsv.Status = "CANCELLED";
                                rsv.Notes += " (Sistem: Batalkan otomatis karena batas waktu pembayaran 15 menit habis)";
                                _logger.LogInformation("Auto-cancelled unpaid reservation {rsvNo} for tenant '{tenantName}' due to timeout.", 
                                    rsv.ReservationNumber, tenant.TenantName);
                            }

                            // 2b. Cancel confirmed PAID reservations if guest is a no-show after 30 minutes (PRD §5, §12)
                            var noShowTimeout = now.AddMinutes(-30);
                            var confirmedReservations = await tenantDb.Reservations
                                .Where(r => r.Status == "CONFIRMED" && r.PaymentStatus == "PAID")
                                .ToListAsync();

                            foreach (var rsv in confirmedReservations)
                            {
                                // Combine Date (Date) and StartTime (TimeSpan) to calculate reservation start DateTime
                                var rsvStart = rsv.Date.Date + rsv.StartTime;
                                // Convert start time to UTC (assuming local db stores them in UTC or local timezone alignment)
                                if (rsvStart < noShowTimeout)
                                {
                                    rsv.Status = "CANCELLED"; // or EXPIRED
                                    rsv.Notes += " (Sistem: Batalkan otomatis karena tidak hadir setelah 30 menit jadwal)";
                                    _logger.LogWarning("Auto-marked no-show reservation {rsvNo} for tenant '{tenantName}' expired.", 
                                        rsv.ReservationNumber, tenant.TenantName);
                                }
                            }

                            await tenantDb.SaveChangesAsync();
                        }
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "Failed to process reservation jobs for tenant '{tenantName}' (DB: {dbName}). Continuing.", 
                            tenant.TenantName, tenant.DatabaseIdentifier);
                    }
                }
            }
        }
    }
}
