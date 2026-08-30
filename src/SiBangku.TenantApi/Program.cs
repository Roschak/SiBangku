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

app.Run();

namespace SiBangku.TenantApi
{
    public partial class Program { }
}
