using Microsoft.EntityFrameworkCore;
using SiBangku.Shared.Models;

namespace SiBangku.Db
{
    public class ControlDbContext : DbContext
    {
        public ControlDbContext(DbContextOptions<ControlDbContext> options) : base(options)
        {
        }

        public DbSet<Tenant> Tenants => Set<Tenant>();
        public DbSet<PlatformUser> PlatformUsers => Set<PlatformUser>();
        public DbSet<Subscription> Subscriptions => Set<Subscription>();
        public DbSet<AuditLog> AuditLogs => Set<AuditLog>();

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // Configure Tenant mapping
            modelBuilder.Entity<Tenant>(entity =>
            {
                entity.ToTable("tenants");
                entity.HasKey(e => e.TenantId);
                entity.HasIndex(e => e.TenantCode).IsUnique();
                entity.Property(e => e.TenantId).HasMaxLength(50);
                entity.Property(e => e.TenantCode).HasMaxLength(50);
                entity.Property(e => e.TenantName).HasMaxLength(100);
                entity.Property(e => e.RestaurantName).HasMaxLength(100);
                entity.Property(e => e.Status).HasMaxLength(50);
                entity.Property(e => e.SubscriptionStatus).HasMaxLength(50);
                entity.Property(e => e.DatabaseIdentifier).HasMaxLength(100);
                entity.Property(e => e.StorageIdentifier).HasMaxLength(100);
                entity.Property(e => e.WebIdentifier).HasMaxLength(255);
                entity.Property(e => e.ApkIdentifier).HasMaxLength(255);
            });

            // Configure PlatformUser mapping
            modelBuilder.Entity<PlatformUser>(entity =>
            {
                entity.ToTable("platform_users");
                entity.HasKey(e => e.UserId);
                entity.HasIndex(e => e.Email).IsUnique();
                entity.Property(e => e.UserId).HasMaxLength(50);
                entity.Property(e => e.Email).HasMaxLength(255);
                entity.Property(e => e.PasswordHash).HasMaxLength(255);
                entity.Property(e => e.Name).HasMaxLength(100);
                entity.Property(e => e.Role).HasMaxLength(50);
            });

            // Configure Subscription mapping
            modelBuilder.Entity<Subscription>(entity =>
            {
                entity.ToTable("subscriptions");
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Id).HasMaxLength(50);
                entity.Property(e => e.TenantId).HasMaxLength(50);
                entity.Property(e => e.PackageId).HasMaxLength(50);
                entity.Property(e => e.Status).HasMaxLength(50);
                entity.Property(e => e.Currency).HasMaxLength(10);
                entity.Property(e => e.BillingCycle).HasMaxLength(50);
                entity.Property(e => e.Provider).HasMaxLength(50);
            });

            // Configure AuditLog mapping
            modelBuilder.Entity<AuditLog>(entity =>
            {
                entity.ToTable("audit_logs");
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Id).HasMaxLength(128);
                entity.Property(e => e.TenantId).HasMaxLength(128);
                entity.Property(e => e.Action).HasMaxLength(128);
                entity.Property(e => e.UserId).HasMaxLength(128);
                entity.Property(e => e.Details).HasColumnType("jsonb");
            });
        }
    }
}
