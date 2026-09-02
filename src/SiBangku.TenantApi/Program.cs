using System;
using System.IO;
using System.Linq;
using System.Security.Claims;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using SiBangku.Db;
using SiBangku.Shared.Models;
using SiBangku.TenantApi.Middleware;
using SiBangku.TenantApi.Services;
using SiBangku.TenantApi;

var builder = WebApplication.CreateBuilder(args);

// 1. Add configurations from environment variables
builder.Configuration.AddEnvironmentVariables();

var controlDbUrl = builder.Configuration["CONTROL_DATABASE_URL"] ?? 
                   "Host=localhost;Database=sibangku_control;Username=sibangku;Password=sibangku_dev";
var jwtSecret = builder.Configuration["JWT_SECRET"] ?? "super_secret_jwt_key_platform_admin_2026";
var key = Encoding.ASCII.GetBytes(jwtSecret);

// 2. Add DbContexts (Control Plane Db is needed for middleware resolution)
if (builder.Configuration["UseInMemoryDatabase"] == "true")
{
    builder.Services.AddDbContext<ControlDbContext>(options => 
        options.UseInMemoryDatabase("ControlDbTest"));
}
else
{
    builder.Services.AddDbContext<ControlDbContext>(options => 
        options.UseNpgsql(controlDbUrl));
}

// 3. Add CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

// 4. Add Authentication and Authorization
builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.RequireHttpsMetadata = false;
    options.SaveToken = true;
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(key),
        ValidateIssuer = false,
        ValidateAudience = false,
        ClockSkew = TimeSpan.Zero
    };
});

builder.Services.AddAuthorization();

// 5. Add Scoped Tenant Context
builder.Services.AddScoped<TenantContext>();

var app = builder.Build();

app.UseCors("AllowAll");

// 6. Dynamic Tenant Resolution Middleware (must run before Auth & Routing)
app.UseMiddleware<TenantResolutionMiddleware>();

app.UseAuthentication();
app.UseAuthorization();

// ==========================================
// API ENDPOINTS
// ==========================================

// --- Health Check Routes (Bypassed by resolution middleware) ---
app.MapGet("/api/v1/health", () => Results.Ok(new
{
    status = "ok",
    service = "tenant-api",
    timestamp = DateTime.UtcNow.ToString("O"),
    version = "2.0.0"
}));

// --- Auth Routes ---
app.MapPost("/api/v1/auth/login", async (HttpContext context, TenantContext tenantContext) =>
{
    var tenantDb = tenantContext.DbContext;
    if (tenantDb == null) return Results.BadRequest("Database unresolved");

    using var document = await JsonDocument.ParseAsync(context.Request.Body);
    var root = document.RootElement;
    
    var email = root.GetProperty("email").GetString();
    var password = root.GetProperty("password").GetString();

    if (string.IsNullOrWhiteSpace(email) || string.IsNullOrWhiteSpace(password))
    {
        return Results.Json(new { success = false, error = new { code = "BAD_REQUEST", message = "Email and password are required" } }, statusCode: 400);
    }

    var user = await tenantDb.Users.FirstOrDefaultAsync(u => u.Email == email);
    if (user == null || !BCrypt.Net.BCrypt.Verify(password, user.PasswordHash))
    {
        return Results.Json(new { success = false, error = new { code = "AUTH_FAILED", message = "Invalid email or password" } }, statusCode: 401);
    }

    // Generate JWT token carrying the TenantId claim for strict isolation checks
    var tokenHandler = new JwtSecurityTokenHandler();
    var tokenDescriptor = new SecurityTokenDescriptor
    {
        Subject = new ClaimsIdentity(new[]
        {
            new Claim(ClaimTypes.NameIdentifier, user.UserId),
            new Claim(ClaimTypes.Email, user.Email),
            new Claim(ClaimTypes.Role, user.Role),
            new Claim("TenantId", user.TenantId) // Critical isolation claim (PRD §106/§206)
        }),
        Expires = DateTime.UtcNow.AddHours(24),
        SigningCredentials = new SigningCredentials(new SymmetricSecurityKey(key), SecurityAlgorithms.HmacSha256Signature)
    };

    var tokenObj = tokenHandler.CreateToken(tokenDescriptor);
    var tokenString = tokenHandler.WriteToken(tokenObj);

    return Results.Ok(new
    {
        success = true,
        data = new
        {
            token = tokenString,
            user = new
            {
                userId = user.UserId,
                email = user.Email,
                name = user.Name,
                role = user.Role,
                mustChangePassword = user.MustChangePassword
            }
        }
    });
});

app.MapPost("/api/v1/auth/change-password", [Authorize] async (HttpContext context, TenantContext tenantContext) =>
{
    var tenantDb = tenantContext.DbContext;
    if (tenantDb == null) return Results.BadRequest("Database unresolved");

    // Strict Tenant Isolation check
    var claimTenantId = context.User.FindFirst("TenantId")?.Value;
    if (claimTenantId != tenantContext.CurrentTenant?.TenantId)
    {
        return Results.Json(new { success = false, error = new { code = "FORBIDDEN", message = "Cross-tenant access forbidden" } }, statusCode: 403);
    }

    using var document = await JsonDocument.ParseAsync(context.Request.Body);
    var root = document.RootElement;
    var newPassword = root.GetProperty("newPassword").GetString();

    if (string.IsNullOrWhiteSpace(newPassword) || newPassword.Length < 6)
    {
        return Results.Json(new { success = false, error = new { code = "BAD_REQUEST", message = "Password must be at least 6 characters" } }, statusCode: 400);
    }

    var userId = context.User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
    var user = await tenantDb.Users.FindAsync(userId);
    
    if (user == null)
    {
        return Results.Json(new { success = false, error = new { code = "NOT_FOUND", message = "User not found" } }, statusCode: 404);
    }

    user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(newPassword, 10);
    user.MustChangePassword = false;
    await tenantDb.SaveChangesAsync();

    return Results.Ok(new { success = true, message = "Password changed successfully" });
});

// --- Table Management Routes (Isolated & Auth protected) ---
app.MapGet("/api/v1/tables", async (TenantContext tenantContext) =>
{
    var tenantDb = tenantContext.DbContext;
    if (tenantDb == null) return Results.BadRequest("Database unresolved");

    var list = await tenantDb.Tables.OrderBy(t => t.TableNumber).ToListAsync();
    return Results.Ok(new { success = true, data = list });
});

app.MapPost("/api/v1/tables", [Authorize(Roles = "TENANT_ADMIN")] async (HttpContext context, Table newTable, TenantContext tenantContext) =>
{
    var tenantDb = tenantContext.DbContext;
    if (tenantDb == null) return Results.BadRequest("Database unresolved");

    var claimTenantId = context.User.FindFirst("TenantId")?.Value;
    if (claimTenantId != tenantContext.CurrentTenant?.TenantId)
    {
        return Results.Json(new { success = false, error = new { code = "FORBIDDEN", message = "Cross-tenant access forbidden" } }, statusCode: 403);
    }

    if (string.IsNullOrWhiteSpace(newTable.TableNumber))
    {
        return Results.Json(new { success = false, error = new { code = "BAD_REQUEST", message = "Table number is required" } }, statusCode: 400);
    }

    // Check unique table number
    var exists = await tenantDb.Tables.AnyAsync(t => t.TableNumber == newTable.TableNumber);
    if (exists)
    {
        return Results.Json(new { success = false, error = new { code = "CONFLICT", message = $"Table number {newTable.TableNumber} already exists" } }, statusCode: 409);
    }

    newTable.TableId = $"tbl-{Guid.NewGuid().ToString("n").Substring(0, 10)}";
    newTable.CreatedAt = DateTime.UtcNow;

    await tenantDb.Tables.AddAsync(newTable);
    await tenantDb.SaveChangesAsync();

    return Results.Ok(new { success = true, data = newTable });
});

app.MapPut("/api/v1/tables/layout", [Authorize(Roles = "TENANT_ADMIN")] async (HttpContext context, TenantContext tenantContext) =>
{
    var tenantDb = tenantContext.DbContext;
    if (tenantDb == null) return Results.BadRequest("Database unresolved");

    var claimTenantId = context.User.FindFirst("TenantId")?.Value;
    if (claimTenantId != tenantContext.CurrentTenant?.TenantId)
    {
        return Results.Json(new { success = false, error = new { code = "FORBIDDEN", message = "Cross-tenant access forbidden" } }, statusCode: 403);
    }

    using var document = await JsonDocument.ParseAsync(context.Request.Body);
    var root = document.RootElement;
    
    if (root.ValueKind != JsonValueKind.Array)
    {
        return Results.Json(new { success = false, error = new { code = "BAD_REQUEST", message = "Body must be an array of table layout coordinates" } }, statusCode: 400);
    }

    // Bulk coordinates layout save (PRD §29, §158)
    foreach (var element in root.EnumerateArray())
    {
        var tableId = element.GetProperty("tableId").GetString();
        var posX = (float)element.GetProperty("posX").GetDouble();
        var posY = (float)element.GetProperty("posY").GetDouble();
        var rotation = element.GetProperty("rotation").GetInt32();

        var table = await tenantDb.Tables.FindAsync(tableId);
        if (table != null)
        {
            table.PosX = posX;
            table.PosY = posY;
            table.Rotation = rotation;
        }
    }

    await tenantDb.SaveChangesAsync();
    return Results.Ok(new { success = true, message = "Visual table layout coordinates saved." });
});

app.MapDelete("/api/v1/tables/{id}", [Authorize(Roles = "TENANT_ADMIN")] async (string id, HttpContext context, TenantContext tenantContext) =>
{
    var tenantDb = tenantContext.DbContext;
    if (tenantDb == null) return Results.BadRequest("Database unresolved");

    var claimTenantId = context.User.FindFirst("TenantId")?.Value;
    if (claimTenantId != tenantContext.CurrentTenant?.TenantId)
    {
        return Results.Json(new { success = false, error = new { code = "FORBIDDEN", message = "Cross-tenant access forbidden" } }, statusCode: 403);
    }

    var table = await tenantDb.Tables.FindAsync(id);
    if (table == null)
    {
        return Results.Json(new { success = false, error = new { code = "NOT_FOUND", message = "Table not found" } }, statusCode: 404);
    }

    tenantDb.Tables.Remove(table);
    await tenantDb.SaveChangesAsync();

    return Results.Ok(new { success = true, message = $"Table {table.TableNumber} deleted." });
});

// --- Settings & Branding Routes ---
app.MapGet("/api/v1/settings/branding", async (TenantContext tenantContext) =>
{
    var tenantDb = tenantContext.DbContext;
    if (tenantDb == null) return Results.BadRequest("Database unresolved");

    var setting = await tenantDb.Settings.FindAsync("branding");
    var jsonString = setting?.Value ?? "{\"primaryColor\":\"#3b82f6\",\"secondaryColor\":\"#1e3a8a\",\"font\":\"Inter\",\"logo\":\"\",\"favicon\":\"\",\"heroImage\":\"\"}";
    
    // Parse to JSON element to return clean JSON structure rather than double-encoded string
    var jsonElement = JsonSerializer.Deserialize<JsonElement>(jsonString);
    return Results.Ok(new { success = true, data = jsonElement });
});

app.MapGet("/api/v1/settings/time_slots", async (TenantContext tenantContext) =>
{
    var tenantDb = tenantContext.DbContext;
    if (tenantDb == null) return Results.BadRequest("Database unresolved");

    var setting = await tenantDb.Settings.FindAsync("time_slots");
    var jsonString = setting?.Value ?? "{\"slotDuration\":60,\"maxConcurrentCovers\":30,\"openingTime\":\"08:00\",\"closingTime\":\"22:00\"}";
    
    var jsonElement = JsonSerializer.Deserialize<JsonElement>(jsonString);
    return Results.Ok(new { success = true, data = jsonElement });
});

app.MapPost("/api/v1/settings/branding", [Authorize(Roles = "TENANT_ADMIN")] async (HttpContext context, TenantContext tenantContext) =>
{
    var tenantDb = tenantContext.DbContext;
    if (tenantDb == null) return Results.BadRequest("Database unresolved");

    var claimTenantId = context.User.FindFirst("TenantId")?.Value;
    if (claimTenantId != tenantContext.CurrentTenant?.TenantId)
    {
        return Results.Json(new { success = false, error = new { code = "FORBIDDEN", message = "Cross-tenant access forbidden" } }, statusCode: 403);
    }

    using var reader = new StreamReader(context.Request.Body);
    var body = await reader.ReadToEndAsync();

    var setting = await tenantDb.Settings.FindAsync("branding");
    if (setting == null)
    {
        setting = new Setting { Key = "branding", Value = body };
        await tenantDb.Settings.AddAsync(setting);
    }
    else
    {
        setting.Value = body;
    }

    await tenantDb.SaveChangesAsync();
    return Results.Ok(new { success = true, data = JsonSerializer.Deserialize<JsonElement>(body) });
});

app.MapPost("/api/v1/settings/time_slots", [Authorize(Roles = "TENANT_ADMIN")] async (HttpContext context, TenantContext tenantContext) =>
{
    var tenantDb = tenantContext.DbContext;
    if (tenantDb == null) return Results.BadRequest("Database unresolved");

    var claimTenantId = context.User.FindFirst("TenantId")?.Value;
    if (claimTenantId != tenantContext.CurrentTenant?.TenantId)
    {
        return Results.Json(new { success = false, error = new { code = "FORBIDDEN", message = "Cross-tenant access forbidden" } }, statusCode: 403);
    }

    using var reader = new StreamReader(context.Request.Body);
    var body = await reader.ReadToEndAsync();

    var setting = await tenantDb.Settings.FindAsync("time_slots");
    if (setting == null)
    {
        setting = new Setting { Key = "time_slots", Value = body };
        await tenantDb.Settings.AddAsync(setting);
    }
    else
    {
        setting.Value = body;
    }

    await tenantDb.SaveChangesAsync();
    return Results.Ok(new { success = true, data = JsonSerializer.Deserialize<JsonElement>(body) });
});

// --- Reservation Routes (Public customer booking endpoints) ---
app.MapPost("/api/v1/reservations", async (CreateReservationDto dto, TenantContext tenantContext) =>
{
    var tenantDb = tenantContext.DbContext;
    if (tenantDb == null) return Results.BadRequest("Database unresolved");

    if (string.IsNullOrWhiteSpace(dto.Name) || string.IsNullOrWhiteSpace(dto.Email) || 
        string.IsNullOrWhiteSpace(dto.Phone) || string.IsNullOrWhiteSpace(dto.StartTime) || 
        string.IsNullOrWhiteSpace(dto.EndTime))
    {
        return Results.Json(new { success = false, error = new { code = "BAD_REQUEST", message = "Semua kolom data diri dan waktu reservasi wajib diisi." } }, statusCode: 400);
    }

    // 1. Parse times
    if (!TimeSpan.TryParse(dto.StartTime, out var startTime) || !TimeSpan.TryParse(dto.EndTime, out var endTime))
    {
        return Results.Json(new { success = false, error = new { code = "BAD_REQUEST", message = "Format jam mulai dan jam selesai tidak valid." } }, statusCode: 400);
    }

    var rsvDate = dto.Date.Date;

    // 2. Verify and assign Table
    Table? table = null;
    if (!string.IsNullOrEmpty(dto.TableId))
    {
        table = await tenantDb.Tables.FirstOrDefaultAsync(t => t.TableId == dto.TableId && t.IsActive);
        if (table == null)
        {
            return Results.Json(new { success = false, error = new { code = "NOT_FOUND", message = "Meja yang dipilih tidak valid atau tidak aktif." } }, statusCode: 404);
        }

        // Check for specific reservation conflict
        var specificConflict = await tenantDb.Reservations.AnyAsync(r => 
            r.TableId == dto.TableId && 
            r.Date == rsvDate && 
            r.Status != "CANCELLED" && 
            r.Status != "REJECTED" && 
            (r.StartTime < endTime && r.EndTime > startTime)
        );

        if (specificConflict)
        {
            return Results.Json(new { success = false, error = new { code = "CONFLICT", message = "Meja ini sudah dipesan untuk slot waktu yang dipilih." } }, statusCode: 409);
        }
    }
    else
    {
        // Auto-assign available table matching capacity (slot-based allocation)
        var availableTables = await tenantDb.Tables
            .Where(t => t.IsActive && t.Capacity >= dto.GuestCount)
            .OrderBy(t => t.Capacity)
            .ToListAsync();

        foreach (var tbl in availableTables)
        {
            var conflict = await tenantDb.Reservations.AnyAsync(r => 
                r.TableId == tbl.TableId && 
                r.Date == rsvDate && 
                r.Status != "CANCELLED" && 
                r.Status != "REJECTED" && 
                (r.StartTime < endTime && r.EndTime > startTime)
            );

            if (!conflict)
            {
                table = tbl;
                break;
            }
        }

        if (table == null)
        {
            return Results.Json(new { success = false, error = new { code = "CONFLICT", message = "Semua meja untuk kapasitas tersebut sudah penuh pada jam ini. Silakan pilih jam atau tanggal lain." } }, statusCode: 409);
        }
    }

    // 3. Find or Create Customer
    var customer = await tenantDb.Customers.FirstOrDefaultAsync(c => c.Email == dto.Email);
    if (customer == null)
    {
        customer = new Customer
        {
            Id = $"cust-{Guid.NewGuid().ToString("n").Substring(0, 10)}",
            Name = dto.Name,
            Email = dto.Email,
            Phone = dto.Phone,
            CreatedAt = DateTime.UtcNow
        };
        await tenantDb.Customers.AddAsync(customer);
    }
    else
    {
        customer.Name = dto.Name;
        customer.Phone = dto.Phone;
    }

    // 4. Create Reservation
    var reservationId = $"rsv-{Guid.NewGuid().ToString("n").Substring(0, 10)}";
    var reservationNumber = SiBangku.Shared.Utils.GenerateReservationNumber();

    var reservation = new Reservation
    {
        Id = reservationId,
        ReservationNumber = reservationNumber,
        CustomerId = customer.Id,
        TableId = table.TableId,
        Date = rsvDate,
        StartTime = startTime,
        EndTime = endTime,
        GuestCount = dto.GuestCount,
        Status = "PENDING",
        PaymentStatus = "UNPAID",
        TotalAmount = 0,
        Notes = dto.Notes ?? string.Empty,
        CreatedAt = DateTime.UtcNow
    };

    await tenantDb.Reservations.AddAsync(reservation);
    await tenantDb.SaveChangesAsync();

    return Results.Ok(new { success = true, data = reservation });
});

app.MapGet("/api/v1/reservations", async (string? date, TenantContext tenantContext) =>
{
    var tenantDb = tenantContext.DbContext;
    if (tenantDb == null) return Results.BadRequest("Database unresolved");

    IQueryable<Reservation> query = tenantDb.Reservations;
    if (!string.IsNullOrEmpty(date) && DateTime.TryParse(date, out var parsedDate))
    {
        var dateOnly = parsedDate.Date;
        query = query.Where(r => r.Date == dateOnly);
    }

    var list = await query.Where(r => r.Status != "CANCELLED" && r.Status != "REJECTED").ToListAsync();
    return Results.Ok(new { success = true, data = list });
});

app.MapGet("/api/v1/reservations/{number}", async (string number, TenantContext tenantContext) =>
{
    var tenantDb = tenantContext.DbContext;
    if (tenantDb == null) return Results.BadRequest("Database unresolved");

    var rsv = await tenantDb.Reservations
        .FirstOrDefaultAsync(r => r.ReservationNumber == number || r.Id == number);

    if (rsv == null)
    {
        return Results.Json(new { success = false, error = new { code = "NOT_FOUND", message = "Reservasi tidak ditemukan." } }, statusCode: 404);
    }

    var customer = await tenantDb.Customers.FindAsync(rsv.CustomerId);
    var table = await tenantDb.Tables.FindAsync(rsv.TableId);

    return Results.Ok(new { 
        success = true, 
        data = rsv, 
        customer = customer, 
        table = table 
    });
});

app.MapPatch("/api/v1/reservations/{id}/status", [Authorize] async (string id, HttpContext context, TenantContext tenantContext) =>
{
    var tenantDb = tenantContext.DbContext;
    if (tenantDb == null) return Results.BadRequest("Database unresolved");

    var claimTenantId = context.User.FindFirst("TenantId")?.Value;
    if (claimTenantId != tenantContext.CurrentTenant?.TenantId)
    {
        return Results.Json(new { success = false, error = new { code = "FORBIDDEN", message = "Cross-tenant access forbidden" } }, statusCode: 403);
    }

    using var document = await JsonDocument.ParseAsync(context.Request.Body);
    var status = document.RootElement.GetProperty("status").GetString() ?? "PENDING";

    var rsv = await tenantDb.Reservations.FindAsync(id);
    if (rsv == null)
    {
        return Results.Json(new { success = false, error = new { code = "NOT_FOUND", message = "Reservasi tidak ditemukan." } }, statusCode: 404);
    }

    rsv.Status = status.ToUpperInvariant();
    await tenantDb.SaveChangesAsync();

    return Results.Ok(new { success = true, data = rsv });
});

app.MapPatch("/api/v1/reservations/{id}/payment", [Authorize] async (string id, HttpContext context, TenantContext tenantContext) =>
{
    var tenantDb = tenantContext.DbContext;
    if (tenantDb == null) return Results.BadRequest("Database unresolved");

    var claimTenantId = context.User.FindFirst("TenantId")?.Value;
    if (claimTenantId != tenantContext.CurrentTenant?.TenantId)
    {
        return Results.Json(new { success = false, error = new { code = "FORBIDDEN", message = "Cross-tenant access forbidden" } }, statusCode: 403);
    }

    using var document = await JsonDocument.ParseAsync(context.Request.Body);
    var paymentStatus = document.RootElement.GetProperty("paymentStatus").GetString() ?? "UNPAID";

    var rsv = await tenantDb.Reservations.FindAsync(id);
    if (rsv == null)
    {
        return Results.Json(new { success = false, error = new { code = "NOT_FOUND", message = "Reservasi tidak ditemukan." } }, statusCode: 404);
    }

    rsv.PaymentStatus = paymentStatus.ToUpperInvariant();
    if (rsv.PaymentStatus == "PAID")
    {
        rsv.Status = "CONFIRMED"; // auto confirm on payment
    }
    await tenantDb.SaveChangesAsync();

    return Results.Ok(new { success = true, data = rsv });
});

app.Run();

namespace SiBangku.TenantApi
{
    public partial class Program { }

    public record CreateReservationDto(
        string? TableId,
        string Name,
        string Email,
        string Phone,
        DateTime Date,
        string StartTime,
        string EndTime,
        int GuestCount,
        string Notes
    );
}
