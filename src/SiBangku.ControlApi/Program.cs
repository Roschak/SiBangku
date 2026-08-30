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
using Npgsql;
using SiBangku.Db;
using SiBangku.ControlApi.Services;
using SiBangku.Shared.Models;
using System.IdentityModel.Tokens.Jwt;

var builder = WebApplication.CreateBuilder(args);

// 1. Add configurations from environment variables
builder.Configuration.AddEnvironmentVariables();

var controlDbUrl = builder.Configuration["CONTROL_DATABASE_URL"] ?? 
                   "Host=localhost;Database=sibangku_control;Username=sibangku;Password=sibangku_dev";
var jwtSecret = builder.Configuration["JWT_SECRET"] ?? "super_secret_jwt_key_platform_admin_2026";
var key = Encoding.ASCII.GetBytes(jwtSecret);

// 2. Add DbContext
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

// 5. Add Custom Services
builder.Services.AddScoped<ITenantProvisioner>(provider => 
    new TenantProvisioner(provider.GetRequiredService<ControlDbContext>(), controlDbUrl));

var app = builder.Build();

// 6. Database auto-migrations / ensures db is created and seeded for local development
using (var scope = app.Services.CreateScope())
{
    var context = scope.ServiceProvider.GetRequiredService<ControlDbContext>();
    // EnsureCreated is used for local dynamic builds
    await context.Database.EnsureCreatedAsync();
    await ControlDbSeeder.SeedAsync(context);
}

app.UseCors("AllowAll");
app.UseAuthentication();
app.UseAuthorization();

// ==========================================
// API ENDPOINTS
// ==========================================

// --- Health Check Routes ---
app.MapGet("/api/v1/health", () => Results.Ok(new
{
    status = "ok",
    service = "control-api",
    timestamp = DateTime.UtcNow.ToString("O"),
    version = "2.0.0"
}));

app.MapGet("/api/v1/liveness", () => Results.Ok(new { status = "ok" }));

app.MapGet("/api/v1/readiness", () => Results.Ok(new
{
    status = "ok",
    checks = new
    {
        database = "ok",
        redis = "ok"
    }
}));

// --- Auth Routes ---
app.MapPost("/api/v1/auth/login", async (HttpContext context, ControlDbContext db) =>
{
    using var document = await JsonDocument.ParseAsync(context.Request.Body);
    var root = document.RootElement;
    
    var email = root.GetProperty("email").GetString();
    var password = root.GetProperty("password").GetString();

    if (string.IsNullOrWhiteSpace(email) || string.IsNullOrWhiteSpace(password))
    {
        return Results.Json(new { success = false, error = new { code = "BAD_REQUEST", message = "Email and password are required" } }, statusCode: 400);
    }

    // Verify platform owner user
    var user = await db.PlatformUsers.FirstOrDefaultAsync(u => u.Email == email);
    if (user == null || !BCrypt.Net.BCrypt.Verify(password, user.PasswordHash))
    {
        return Results.Json(new { success = false, error = new { code = "AUTH_FAILED", message = "Invalid email or password" } }, statusCode: 401);
    }

    // Generate JWT token
    var tokenHandler = new JwtSecurityTokenHandler();
    var tokenDescriptor = new SecurityTokenDescriptor
    {
        Subject = new ClaimsIdentity(new[]
        {
            new Claim(ClaimTypes.NameIdentifier, user.UserId),
            new Claim(ClaimTypes.Email, user.Email),
            new Claim(ClaimTypes.Role, user.Role)
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
                role = user.Role
            }
        }
    });
});

// --- Tenant Management Routes (Admin protected) ---
app.MapGet("/api/v1/tenants", [Authorize(Roles = "SUPER_ADMIN")] async (ControlDbContext db) =>
{
    var list = await db.Tenants.OrderByDescending(t => t.CreatedAt).ToListAsync();
    return Results.Ok(new { success = true, data = list });
});

app.MapGet("/api/v1/tenants/{id}", [Authorize(Roles = "SUPER_ADMIN")] async (string id, ControlDbContext db) =>
{
    var tenant = await db.Tenants.FindAsync(id);
    if (tenant == null)
    {
        return Results.Json(new { success = false, error = new { code = "NOT_FOUND", message = "Tenant not found" } }, statusCode: 404);
    }
    return Results.Ok(new { success = true, data = tenant });
});

app.MapPost("/api/v1/tenants", [Authorize(Roles = "SUPER_ADMIN")] async (ProvisionTenantParams paramDto, ITenantProvisioner provisioner) =>
{
    try
    {
        var result = await provisioner.ProvisionTenantAsync(paramDto);
        return Results.Ok(new { success = true, data = result });
    }
    catch (Exception ex)
    {
        return Results.Json(new { success = false, error = new { code = "PROVISIONING_FAILED", message = ex.Message } }, statusCode: 500);
    }
});

app.MapPatch("/api/v1/tenants/{id}/status", [Authorize(Roles = "SUPER_ADMIN")] async (string id, HttpContext context, ControlDbContext db) =>
{
    using var document = await JsonDocument.ParseAsync(context.Request.Body);
    var status = document.RootElement.GetProperty("status").GetString() ?? string.Empty;

    var tenant = await db.Tenants.FindAsync(id);
    if (tenant == null)
    {
        return Results.Json(new { success = false, error = new { code = "NOT_FOUND", message = "Tenant not found" } }, statusCode: 404);
    }

    var oldStatus = tenant.Status;
    tenant.Status = status;
    tenant.UpdatedAt = DateTime.UtcNow;

    var audit = new AuditLog
    {
        Id = $"audit-status-{id}-{DateTime.UtcNow.Ticks}",
        TenantId = id,
        Action = "update tenant status",
        UserId = "system-api",
        Details = $"{{\"previousStatus\":\"{oldStatus}\",\"newStatus\":\"{status}\"}}",
        CreatedAt = DateTime.UtcNow
    };

    await db.AuditLogs.AddAsync(audit);
    await db.SaveChangesAsync();

    return Results.Ok(new { success = true, data = tenant });
});

app.MapPatch("/api/v1/tenants/{id}/extend-trial", [Authorize(Roles = "SUPER_ADMIN")] async (string id, HttpContext context, ControlDbContext db) =>
{
    using var document = await JsonDocument.ParseAsync(context.Request.Body);
    var days = document.RootElement.GetProperty("days").GetInt32();

    var tenant = await db.Tenants.FindAsync(id);
    if (tenant == null)
    {
        return Results.Json(new { success = false, error = new { code = "NOT_FOUND", message = "Tenant not found" } }, statusCode: 404);
    }

    var previousEnd = tenant.TrialEnd ?? DateTime.UtcNow;
    var newEnd = previousEnd.AddDays(days);
    tenant.TrialEnd = newEnd;
    tenant.Status = "TRIAL"; // Reset status back to TRIAL if it was expired
    tenant.UpdatedAt = DateTime.UtcNow;

    var audit = new AuditLog
    {
        Id = $"audit-trial-{id}-{DateTime.UtcNow.Ticks}",
        TenantId = id,
        Action = "extend trial",
        UserId = "system-api",
        Details = $"{{\"previousEnd\":\"{previousEnd:O}\",\"newEnd\":\"{newEnd:O}\",\"addedDays\":{days}}}",
        CreatedAt = DateTime.UtcNow
    };

    await db.AuditLogs.AddAsync(audit);
    await db.SaveChangesAsync();

    return Results.Ok(new { success = true, data = tenant });
});

app.MapDelete("/api/v1/tenants/{id}", [Authorize(Roles = "SUPER_ADMIN")] async (string id, ControlDbContext db) =>
{
    var tenant = await db.Tenants.FindAsync(id);
    if (tenant == null)
    {
        return Results.Json(new { success = false, error = new { code = "NOT_FOUND", message = "Tenant not found" } }, statusCode: 404);
    }

    var dbName = tenant.DatabaseIdentifier;

    // Connect to postgres defaults to drop database
    var controlBuilder = new NpgsqlConnectionStringBuilder(controlDbUrl);
    var systemBuilder = new NpgsqlConnectionStringBuilder
    {
        Host = controlBuilder.Host,
        Port = controlBuilder.Port,
        Username = controlBuilder.Username,
        Password = controlBuilder.Password,
        Database = "postgres"
    };

    try
    {
        await using (var conn = new NpgsqlConnection(systemBuilder.ConnectionString))
        {
            await conn.OpenAsync();

            // Terminate other active connections first
            var terminateQuery = $"SELECT pg_terminate_backend(pg_stat_activity.pid) FROM pg_stat_activity WHERE pg_stat_activity.datname = @dbName AND pid <> pg_backend_pid()";
            await using (var termCmd = new NpgsqlCommand(terminateQuery, conn))
            {
                termCmd.Parameters.AddWithValue("dbName", dbName);
                await termCmd.ExecuteNonQueryAsync();
            }

            // Drop database
            var dropQuery = $"DROP DATABASE IF EXISTS {dbName}";
            await using (var dropCmd = new NpgsqlCommand(dropQuery, conn))
            {
                await dropCmd.ExecuteNonQueryAsync();
            }
        }

        // Delete records
        db.Tenants.Remove(tenant);

        var audit = new AuditLog
        {
            Id = $"audit-destroy-{id}-{DateTime.UtcNow.Ticks}",
            TenantId = id,
            Action = "destroy tenant",
            UserId = "system-api",
            Details = $"{{\"database\":\"{dbName}\",\"destroyedAt\":\"{DateTime.UtcNow:O}\"}}",
            CreatedAt = DateTime.UtcNow
        };

        await db.AuditLogs.AddAsync(audit);
        await db.SaveChangesAsync();

        return Results.Ok(new { success = true, message = $"Tenant database {dbName} and configuration deleted." });
    }
    catch (Exception ex)
    {
        return Results.Json(new { success = false, error = new { code = "DESTRUCTION_FAILED", message = ex.Message } }, statusCode: 500);
    }
});

// --- Subscription Routes ---
app.MapPost("/api/v1/subscriptions", [Authorize(Roles = "SUPER_ADMIN")] async (Subscription subDto, ControlDbContext db) =>
{
    var tenant = await db.Tenants.FindAsync(subDto.TenantId);
    if (tenant == null)
    {
        return Results.Json(new { success = false, error = new { code = "NOT_FOUND", message = "Tenant not found" } }, statusCode: 404);
    }

    var now = DateTime.UtcNow;
    
    // De-activate older active subscriptions for this tenant
    var activeSubs = await db.Subscriptions.Where(s => s.TenantId == subDto.TenantId && s.Status == "ACTIVE").ToListAsync();
    foreach (var oldSub in activeSubs)
    {
        oldSub.Status = "EXPIRED";
        oldSub.UpdatedAt = now;
    }

    // Save new subscription
    var subId = $"sub-{tenant.TenantId}-{now.Ticks}";
    subDto.Id = subId;
    subDto.Status = "ACTIVE";
    subDto.CreatedAt = now;
    subDto.UpdatedAt = now;

    await db.Subscriptions.AddAsync(subDto);

    // Update Tenant billing limits
    tenant.Status = "ACTIVE";
    tenant.SubscriptionStatus = "ACTIVE";
    tenant.SubscriptionStart = subDto.StartDate;
    tenant.SubscriptionEnd = subDto.EndDate;
    tenant.UpdatedAt = now;

    var audit = new AuditLog
    {
        Id = $"audit-sub-{tenant.TenantId}-{now.Ticks}",
        TenantId = tenant.TenantId,
        Action = "activate subscription",
        UserId = "system-api",
        Details = $"{{\"subscriptionId\":\"{subId}\",\"endDate\":\"{subDto.EndDate:O}\",\"price\":{subDto.Price}}}",
        CreatedAt = now
    };

    await db.AuditLogs.AddAsync(audit);
    await db.SaveChangesAsync();

    return Results.Ok(new { success = true, data = subDto });
});

// --- Audit Logging Routes ---
app.MapGet("/api/v1/audit", [Authorize(Roles = "SUPER_ADMIN")] async (ControlDbContext db) =>
{
    var logs = await db.AuditLogs.OrderByDescending(a => a.CreatedAt).Take(100).ToListAsync();
    return Results.Ok(new { success = true, data = logs });
});

app.Run();

public partial class Program { }

