using System;

namespace SiBangku.Shared.Models
{
    public class Tenant
    {
        public string TenantId { get; set; } = string.Empty;
        public string TenantCode { get; set; } = string.Empty;
        public string TenantName { get; set; } = string.Empty;
        public string RestaurantName { get; set; } = string.Empty;
        public string Status { get; set; } = "PROVISIONING"; // PROVISIONING, TRIAL, ACTIVE, SUSPENDED, TRIAL_EXPIRED, SUBSCRIPTION_EXPIRED
        public string SubscriptionStatus { get; set; } = "TRIAL"; // TRIAL, ACTIVE, EXPIRED, CANCELLED
        public DateTime? TrialStart { get; set; }
        public DateTime? TrialEnd { get; set; }
        public DateTime? SubscriptionStart { get; set; }
        public DateTime? SubscriptionEnd { get; set; }
        public string DatabaseIdentifier { get; set; } = string.Empty;
        public string StorageIdentifier { get; set; } = string.Empty;
        public string WebIdentifier { get; set; } = string.Empty;
        public string ApkIdentifier { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }

    public class PlatformUser
    {
        public string UserId { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string PasswordHash { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string Role { get; set; } = "SUPER_ADMIN";
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }

    public class User
    {
        public string UserId { get; set; } = string.Empty;
        public string TenantId { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string PasswordHash { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string Role { get; set; } = "TENANT_ADMIN"; // TENANT_ADMIN, MANAGER, WAITER, CASHIER, KITCHEN
        public bool MustChangePassword { get; set; } = true;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }

    public class Table
    {
        public string TableId { get; set; } = string.Empty;
        public string TableNumber { get; set; } = string.Empty;
        public string Shape { get; set; } = "SQUARE"; // SQUARE, ROUND, RECTANGLE, BOOTH
        public int Capacity { get; set; } = 4;
        public float PosX { get; set; } = 0;
        public float PosY { get; set; } = 0;
        public int Rotation { get; set; } = 0;
        public bool IsActive { get; set; } = true;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }

    public class MenuCategory
    {
        public string Id { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string Slug { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }

    public class MenuItem
    {
        public string Id { get; set; } = string.Empty;
        public string CategoryId { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public decimal Price { get; set; } = 0;
        public string Description { get; set; } = string.Empty;
        public string ImageUrl { get; set; } = string.Empty;
        public int StockCapacity { get; set; } = 0;
        public bool IsAvailable { get; set; } = true;
        public int PrepTime { get; set; } = 15; // in minutes
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }

    public class Customer
    {
        public string Id { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string Phone { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }

    public class Reservation
    {
        public string Id { get; set; } = string.Empty;
        public string ReservationNumber { get; set; } = string.Empty;
        public string CustomerId { get; set; } = string.Empty;
        public string TableId { get; set; } = string.Empty;
        public DateTime Date { get; set; }
        public TimeSpan StartTime { get; set; }
        public TimeSpan EndTime { get; set; }
        public int GuestCount { get; set; }
        public string Status { get; set; } = "PENDING"; // PENDING, CONFIRMED, ARRIVED, SEATED, COMPLETED, CANCELLED, REJECTED
        public decimal TotalAmount { get; set; } = 0;
        public string Notes { get; set; } = string.Empty;
        public string PaymentStatus { get; set; } = "UNPAID"; // UNPAID, PENDING, PAID, EXPIRED, REFUNDED
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }

    public class OrderItem
    {
        public string Id { get; set; } = string.Empty;
        public string OrderId { get; set; } = string.Empty;
        public string MenuItemId { get; set; } = string.Empty;
        public int Quantity { get; set; }
        public decimal Price { get; set; }
        public string Notes { get; set; } = string.Empty;
    }

    public class Order
    {
        public string Id { get; set; } = string.Empty;
        public string ReservationId { get; set; } = string.Empty;
        public string Status { get; set; } = "PENDING"; // PENDING, PREPARING, SERVED, COMPLETED, CANCELLED
        public decimal TotalAmount { get; set; } = 0;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }

    public class Payment
    {
        public string Id { get; set; } = string.Empty;
        public string OrderId { get; set; } = string.Empty;
        public string ReservationId { get; set; } = string.Empty;
        public decimal Amount { get; set; }
        public string PaymentMethod { get; set; } = string.Empty;
        public string Status { get; set; } = "PENDING"; // PENDING, SUCCESS, FAILED, EXPIRED
        public string SnapToken { get; set; } = string.Empty;
        public string TransactionId { get; set; } = string.Empty;
        public DateTime? PaidAt { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }

    public class Setting
    {
        public string Key { get; set; } = string.Empty;
        public string Value { get; set; } = string.Empty; // JSON format
    }

    public class Subscription
    {
        public string Id { get; set; } = string.Empty;
        public string TenantId { get; set; } = string.Empty;
        public string PackageId { get; set; } = string.Empty; // dynamic package
        public string Status { get; set; } = "ACTIVE"; // ACTIVE, EXPIRED, CANCELLED
        public decimal Price { get; set; }
        public string Currency { get; set; } = "IDR";
        public string BillingCycle { get; set; } = "MONTHLY"; // MONTHLY, YEARLY
        public string Provider { get; set; } = "MANUAL";
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }

    public class AuditLog
    {
        public string Id { get; set; } = string.Empty;
        public string TenantId { get; set; } = string.Empty;
        public string Action { get; set; } = string.Empty;
        public string UserId { get; set; } = string.Empty;
        public string Details { get; set; } = string.Empty; // JSON format
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
