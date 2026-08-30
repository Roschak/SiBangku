using Microsoft.EntityFrameworkCore;
using SiBangku.Shared.Models;

namespace SiBangku.Db
{
    public class TenantDbContext : DbContext
    {
        public TenantDbContext(DbContextOptions<TenantDbContext> options) : base(options)
        {
        }

        public DbSet<User> Users => Set<User>();
        public DbSet<Table> Tables => Set<Table>();
        public DbSet<MenuCategory> MenuCategories => Set<MenuCategory>();
        public DbSet<MenuItem> MenuItems => Set<MenuItem>();
        public DbSet<Customer> Customers => Set<Customer>();
        public DbSet<Reservation> Reservations => Set<Reservation>();
        public DbSet<OrderItem> OrderItems => Set<OrderItem>();
        public DbSet<Order> Orders => Set<Order>();
        public DbSet<Payment> Payments => Set<Payment>();
        public DbSet<Setting> Settings => Set<Setting>();

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // Configure User mapping
            modelBuilder.Entity<User>(entity =>
            {
                entity.ToTable("users");
                entity.HasKey(e => e.UserId);
                entity.HasIndex(e => e.Email).IsUnique();
                entity.Property(e => e.UserId).HasMaxLength(50);
                entity.Property(e => e.TenantId).HasMaxLength(50);
                entity.Property(e => e.Email).HasMaxLength(255);
                entity.Property(e => e.PasswordHash).HasMaxLength(255);
                entity.Property(e => e.Name).HasMaxLength(100);
                entity.Property(e => e.Role).HasMaxLength(50);
            });

            // Configure Table mapping
            modelBuilder.Entity<Table>(entity =>
            {
                entity.ToTable("tables");
                entity.HasKey(e => e.TableId);
                entity.HasIndex(e => e.TableNumber).IsUnique();
                entity.Property(e => e.TableId).HasMaxLength(50);
                entity.Property(e => e.TableNumber).HasMaxLength(50);
                entity.Property(e => e.Shape).HasMaxLength(50);
            });

            // Configure MenuCategory mapping
            modelBuilder.Entity<MenuCategory>(entity =>
            {
                entity.ToTable("menu_categories");
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Id).HasMaxLength(50);
                entity.Property(e => e.Name).HasMaxLength(100);
                entity.Property(e => e.Slug).HasMaxLength(100);
            });

            // Configure MenuItem mapping
            modelBuilder.Entity<MenuItem>(entity =>
            {
                entity.ToTable("menu_items");
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Id).HasMaxLength(50);
                entity.Property(e => e.CategoryId).HasMaxLength(50);
                entity.Property(e => e.Name).HasMaxLength(100);
                entity.Property(e => e.Description).HasMaxLength(500);
                entity.Property(e => e.ImageUrl).HasMaxLength(500);
                entity.Property(e => e.Price).HasPrecision(18, 2);
            });

            // Configure Customer mapping
            modelBuilder.Entity<Customer>(entity =>
            {
                entity.ToTable("customers");
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Id).HasMaxLength(50);
                entity.Property(e => e.Name).HasMaxLength(100);
                entity.Property(e => e.Email).HasMaxLength(255);
                entity.Property(e => e.Phone).HasMaxLength(50);
            });

            // Configure Reservation mapping
            modelBuilder.Entity<Reservation>(entity =>
            {
                entity.ToTable("reservations");
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Id).HasMaxLength(50);
                entity.Property(e => e.ReservationNumber).HasMaxLength(50);
                entity.Property(e => e.CustomerId).HasMaxLength(50);
                entity.Property(e => e.TableId).HasMaxLength(50);
                entity.Property(e => e.Status).HasMaxLength(50);
                entity.Property(e => e.PaymentStatus).HasMaxLength(50);
                entity.Property(e => e.TotalAmount).HasPrecision(18, 2);
                entity.Property(e => e.Notes).HasMaxLength(500);
            });

            // Configure OrderItem mapping
            modelBuilder.Entity<OrderItem>(entity =>
            {
                entity.ToTable("order_items");
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Id).HasMaxLength(50);
                entity.Property(e => e.OrderId).HasMaxLength(50);
                entity.Property(e => e.MenuItemId).HasMaxLength(50);
                entity.Property(e => e.Price).HasPrecision(18, 2);
                entity.Property(e => e.Notes).HasMaxLength(255);
            });

            // Configure Order mapping
            modelBuilder.Entity<Order>(entity =>
            {
                entity.ToTable("orders");
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Id).HasMaxLength(50);
                entity.Property(e => e.ReservationId).HasMaxLength(50);
                entity.Property(e => e.Status).HasMaxLength(50);
                entity.Property(e => e.TotalAmount).HasPrecision(18, 2);
            });

            // Configure Payment mapping
            modelBuilder.Entity<Payment>(entity =>
            {
                entity.ToTable("payments");
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Id).HasMaxLength(50);
                entity.Property(e => e.OrderId).HasMaxLength(50);
                entity.Property(e => e.ReservationId).HasMaxLength(50);
                entity.Property(e => e.PaymentMethod).HasMaxLength(50);
                entity.Property(e => e.Status).HasMaxLength(50);
                entity.Property(e => e.SnapToken).HasMaxLength(255);
                entity.Property(e => e.TransactionId).HasMaxLength(255);
                entity.Property(e => e.Amount).HasPrecision(18, 2);
            });

            // Configure Setting mapping
            modelBuilder.Entity<Setting>(entity =>
            {
                entity.ToTable("settings");
                entity.HasKey(e => e.Key);
                entity.Property(e => e.Key).HasMaxLength(100);
                entity.Property(e => e.Value).HasColumnType("text");
            });
        }
    }
}
