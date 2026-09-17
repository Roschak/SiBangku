using System;
using System.IO;
using System.Linq;
using System.Data;
using System.Security.Claims;
using System.Text;
using System.Text.Json;
using System.Threading.RateLimiting;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using SiBangku.Db;
using SiBangku.Shared.Models;
using SiBangku.Shared.Security;
using SiBangku.TenantApi.Middleware;
using SiBangku.TenantApi.Services;
using SiBangku.TenantApi;

var builder = WebApplication.CreateBuilder(args);

// 1. Add configurations from environment variables
builder.Configuration.AddEnvironmentVariables();

var controlDbUrl = builder.Configuration["CONTROL_DATABASE_URL"] ??
                   "Host=localhost;Database=sibangku_control;Username=sibangku;Password=sibangku_dev";

// Secrets must come from configuration (environment variables). A signing key
// is never hardcoded for production: the Development fallback exists only so
// that a plain `dotnet run` works locally.
var jwtSecret = builder.Configuration["JWT_SECRET"];
if (string.IsNullOrWhiteSpace(jwtSecret))
{
    if (!builder.Environment.IsDevelopment())
    {
        throw new InvalidOperationException(
            "JWT_SECRET is not configured. Set the JWT_SECRET environment variable before starting the Tenant API.");
    }
    jwtSecret = "sibangku-dev-only-insecure-jwt-signing-secret";
}

// HMAC-SHA256 requires a 256-bit key; reject weak secrets early instead of
// failing later at token signing time.
if (Encoding.UTF8.GetByteCount(jwtSecret) < 32)
{
    throw new InvalidOperationException(
        "JWT_SECRET must be at least 32 bytes (256 bits). Generate one with: openssl rand -hex 32");
}

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

// 3. Add CORS - explicit origin allowlist from configuration (no wildcard).
var allowedOrigins = (builder.Configuration["CORS_ALLOWED_ORIGINS"] ?? "http://localhost:3000")
    .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

builder.Services.AddCors(options =>
{
    options.AddPolicy("SiBangkuCors", policy =>
    {
        policy.WithOrigins(allowedOrigins)
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

// 3b. Rate limiting: credential brute-force and public booking flood protection.
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;

    options.AddPolicy("auth", context => RateLimitPartition.GetFixedWindowLimiter(
        context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
        _ => new FixedWindowRateLimiterOptions
        {
            PermitLimit = 10,
            Window = TimeSpan.FromMinutes(1),
            QueueLimit = 0
        }));

    options.AddPolicy("booking", context => RateLimitPartition.GetFixedWindowLimiter(
        context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
        _ => new FixedWindowRateLimiterOptions
        {
            PermitLimit = 30,
            Window = TimeSpan.FromMinutes(1),
            QueueLimit = 0
        }));
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

// Uniform response for a password that fails the platform policy, so every
// endpoint reports the exact unmet requirement instead of a generic failure.
static IResult WeakPasswordResult(PasswordPolicyResult result) =>
    Results.Json(new { success = false, error = new { code = "WEAK_PASSWORD", message = result.ErrorSummary } }, statusCode: 400);

// Platform defaults for tenant settings: used when a tenant never saved a value,
// and when a stored value is unreadable.
const string DefaultBrandingJson =
    "{\"primaryColor\":\"#3b82f6\",\"secondaryColor\":\"#1e3a8a\",\"font\":\"Inter\",\"logo\":\"\",\"favicon\":\"\",\"heroImage\":\"\"}";
const string DefaultPortalBrandingJson =
    "{\"primaryColor\":\"#D4AF37\",\"secondaryColor\":\"#A07E3F\",\"font\":\"Plus Jakarta Sans\",\"logo\":\"\",\"favicon\":\"\",\"heroImage\":\"\"}";
const string DefaultTimeSlotsJson =
    "{\"slotDuration\":60,\"maxConcurrentCovers\":30,\"openingTime\":\"08:00\",\"closingTime\":\"22:00\"}";

// Parses a stored settings value, degrading to the platform default when the row
// is missing, corrupt, or not a JSON object. Both portals parse these values on
// every page load, so an unreadable row must never surface as a 500 on a public
// endpoint - a value written by an older deployment must not keep an outlet down.
static JsonElement ReadStoredJson(string? storedValue, string fallbackJson)
{
    if (!string.IsNullOrWhiteSpace(storedValue))
    {
        try
        {
            using var document = JsonDocument.Parse(storedValue);
            if (document.RootElement.ValueKind == JsonValueKind.Object)
            {
                return document.RootElement.Clone();
            }
        }
        catch (JsonException)
        {
            // Fall through to the platform default below.
        }
    }

    using var fallback = JsonDocument.Parse(fallbackJson);
    return fallback.RootElement.Clone();
}

// Uniform error shape for the settings endpoints.
static IResult SettingsRejected(string code, string message, int statusCode) =>
    Results.Json(new { success = false, error = new { code, message } }, statusCode: statusCode);

// Reads a small JSON *object* body for the settings endpoints.
//
// Validation runs before anything is persisted. Both portals parse the stored
// settings on every page load, so a corrupt row would take down a tenant's
// public booking page (HTTP 500) until someone fixed it by hand - a malformed
// request must therefore never reach the settings table.
static async Task<(bool Ok, string Value, IResult? Error)> ReadSettingsJsonBodyAsync(HttpContext context)
{
    // Settings are a handful of fields; cap far above the real payload but still
    // bounded enough that the column can never be used as arbitrary storage.
    const int maxBytes = 16 * 1024;

    if (context.Request.ContentLength is > maxBytes)
    {
        return (false, string.Empty, SettingsRejected("PAYLOAD_TOO_LARGE", "Ukuran pengaturan melebihi batas 16 KB.", 413));
    }

    using var reader = new StreamReader(context.Request.Body);
    var body = await reader.ReadToEndAsync();

    if (body.Length > maxBytes)
    {
        return (false, string.Empty, SettingsRejected("PAYLOAD_TOO_LARGE", "Ukuran pengaturan melebihi batas 16 KB.", 413));
    }

    try
    {
        using var document = JsonDocument.Parse(body);
        if (document.RootElement.ValueKind != JsonValueKind.Object)
        {
            return (false, string.Empty, SettingsRejected("BAD_REQUEST", "Pengaturan harus berupa objek JSON.", 400));
        }

        // Persist the canonical text so the stored value is valid JSON by construction.
        return (true, document.RootElement.GetRawText(), null);
    }
    catch (JsonException)
    {
        return (false, string.Empty, SettingsRejected("BAD_REQUEST", "Format JSON pengaturan tidak valid.", 400));
    }
}

// 5b. Defensive security response headers for every API response.
app.Use(async (context, next) =>
{
    var headers = context.Response.Headers;
    headers["X-Content-Type-Options"] = "nosniff";
    headers["X-Frame-Options"] = "DENY";
    headers["Referrer-Policy"] = "no-referrer";
    headers["Permissions-Policy"] = "camera=(self), microphone=(), geolocation=()";
    headers["Cross-Origin-Resource-Policy"] = "same-site";
    headers.Remove("Server");
    await next();
});

app.UseCors("SiBangkuCors");
app.UseRateLimiter();

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
app.MapPost("/api/v1/auth/login", async (HttpContext context, TenantContext tenantContext, ILogger<Program> logger) =>
{
    var tenantDb = tenantContext.DbContext;
    if (tenantDb == null) return Results.BadRequest("Database unresolved");

    JsonDocument document;
    try
    {
        document = await JsonDocument.ParseAsync(context.Request.Body);
    }
    catch (JsonException)
    {
        return Results.Json(new { success = false, error = new { code = "BAD_REQUEST", message = "Format permintaan tidak valid." } }, statusCode: 400);
    }

    using (document)
    {
        var root = document.RootElement;

        if (root.ValueKind != JsonValueKind.Object)
        {
            return Results.Json(new { success = false, error = new { code = "BAD_REQUEST", message = "Format permintaan tidak valid." } }, statusCode: 400);
        }

        var email = (root.TryGetProperty("email", out var emailProp) ? emailProp.GetString() : null)?.Trim();
        var password = root.TryGetProperty("password", out var passwordProp) ? passwordProp.GetString() : null;

        if (string.IsNullOrWhiteSpace(email) || string.IsNullOrWhiteSpace(password))
        {
            return Results.Json(new { success = false, error = new { code = "BAD_REQUEST", message = "Email and password are required" } }, statusCode: 400);
        }

        var user = await tenantDb.Users.FirstOrDefaultAsync(u => u.Email.ToLower() == email.ToLower());
        if (user == null || !PasswordHasher.Verify(password, user.PasswordHash))
        {
            // Security observability: record the attempt without logging credentials.
            logger.LogWarning("Failed tenant login attempt for {Email} on tenant {TenantCode}.",
                email, tenantContext.CurrentTenant?.TenantCode ?? "unknown");

            return Results.Json(new { success = false, error = new { code = "AUTH_FAILED", message = "Invalid email or password" } }, statusCode: 401);
        }

        // Transparently upgrade legacy hashes (BCrypt or weaker Argon2 settings) to
        // the current Argon2id parameters on every successful sign-in.
        if (PasswordHasher.NeedsRehash(user.PasswordHash))
        {
            try
            {
                user.PasswordHash = PasswordHasher.Hash(password);
                await tenantDb.SaveChangesAsync();
            }
            catch { /* a hashing upgrade must never block a valid sign-in */ }
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
    }
}).RequireRateLimiting("auth");

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
    var newPassword = root.TryGetProperty("newPassword", out var newPasswordProp) ? newPasswordProp.GetString() : null;

    var userId = context.User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
    var user = await tenantDb.Users.FindAsync(userId);

    if (user == null)
    {
        return Results.Json(new { success = false, error = new { code = "NOT_FOUND", message = "User not found" } }, statusCode: 404);
    }

    var policyResult = PasswordPolicy.Validate(newPassword, user.Email);
    if (!policyResult.IsValid)
    {
        return WeakPasswordResult(policyResult);
    }

    user.PasswordHash = PasswordHasher.Hash(newPassword!);
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

    if (string.IsNullOrWhiteSpace(newTable.TableNumber) || newTable.TableNumber.Length > 50)
    {
        return Results.Json(new { success = false, error = new { code = "BAD_REQUEST", message = "Table number is required" } }, statusCode: 400);
    }

    if (newTable.Capacity < 1 || newTable.Capacity > 100)
    {
        return Results.Json(new { success = false, error = new { code = "BAD_REQUEST", message = "Table capacity must be between 1 and 100" } }, statusCode: 400);
    }

    // Allowlist the physical shape so arbitrary client values never reach the database.
    var allowedShapes = new[] { "ROUND", "SQUARE", "RECTANGLE", "BOOTH", "BAR", "CUSTOM" };
    var shape = string.IsNullOrWhiteSpace(newTable.Shape) ? "SQUARE" : newTable.Shape.Trim().ToUpperInvariant();
    if (!allowedShapes.Contains(shape))
    {
        return Results.Json(new { success = false, error = new { code = "BAD_REQUEST", message = "Table shape is not recognised" } }, statusCode: 400);
    }
    newTable.Shape = shape;
    newTable.TableNumber = newTable.TableNumber.Trim().ToUpperInvariant();

    // Check unique table number
    var exists = await tenantDb.Tables.AnyAsync(t => t.TableNumber == newTable.TableNumber);
    if (exists)
    {
        return Results.Json(new { success = false, error = new { code = "CONFLICT", message = $"Table number {newTable.TableNumber} already exists" } }, statusCode: 409);
    }

    // Server owns identity and timestamps; ignore any client-supplied values.
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
        if (element.ValueKind != JsonValueKind.Object) continue;

        var tableId = element.TryGetProperty("tableId", out var idProp) ? idProp.GetString() : null;
        if (string.IsNullOrWhiteSpace(tableId)) continue;

        var posX = element.TryGetProperty("posX", out var xProp) && xProp.TryGetDouble(out var parsedX) ? (float)parsedX : 0f;
        var posY = element.TryGetProperty("posY", out var yProp) && yProp.TryGetDouble(out var parsedY) ? (float)parsedY : 0f;
        var rotation = element.TryGetProperty("rotation", out var rProp) && rProp.TryGetInt32(out var parsedRotation) ? parsedRotation : 0;

        // Keep coordinates inside a sane canvas range and rotation in [0, 360).
        posX = Math.Clamp(posX, -5000f, 5000f);
        posY = Math.Clamp(posY, -5000f, 5000f);
        rotation = ((rotation % 360) + 360) % 360;

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

    // Returned as a JSON object rather than a double-encoded string.
    return Results.Ok(new { success = true, data = ReadStoredJson(setting?.Value, DefaultBrandingJson) });
});

app.MapGet("/api/v1/settings/time_slots", async (TenantContext tenantContext) =>
{
    var tenantDb = tenantContext.DbContext;
    if (tenantDb == null) return Results.BadRequest("Database unresolved");

    var setting = await tenantDb.Settings.FindAsync("time_slots");

    return Results.Ok(new { success = true, data = ReadStoredJson(setting?.Value, DefaultTimeSlotsJson) });
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

    var payload = await ReadSettingsJsonBodyAsync(context);
    if (payload.Error != null) return payload.Error;

    var setting = await tenantDb.Settings.FindAsync("branding");
    if (setting == null)
    {
        setting = new Setting { Key = "branding", Value = payload.Value };
        await tenantDb.Settings.AddAsync(setting);
    }
    else
    {
        setting.Value = payload.Value;
    }

    await tenantDb.SaveChangesAsync();
    return Results.Ok(new { success = true, data = JsonSerializer.Deserialize<JsonElement>(payload.Value) });
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

    var payload = await ReadSettingsJsonBodyAsync(context);
    if (payload.Error != null) return payload.Error;

    var setting = await tenantDb.Settings.FindAsync("time_slots");
    if (setting == null)
    {
        setting = new Setting { Key = "time_slots", Value = payload.Value };
        await tenantDb.Settings.AddAsync(setting);
    }
    else
    {
        setting.Value = payload.Value;
    }

    await tenantDb.SaveChangesAsync();
    return Results.Ok(new { success = true, data = JsonSerializer.Deserialize<JsonElement>(payload.Value) });
});

// --- Composite Branding & Settings Endpoints for Web Portals ---
app.MapGet("/api/v1/branding", async (TenantContext tenantContext) =>
{
    var tenantDb = tenantContext.DbContext;
    if (tenantDb == null) return Results.BadRequest("Database unresolved");

    var brandingSetting = await tenantDb.Settings.FindAsync("branding");
    var brandingObj = ReadStoredJson(brandingSetting?.Value, DefaultPortalBrandingJson);

    var timeSlotsSetting = await tenantDb.Settings.FindAsync("time_slots");
    var timeSlotsObj = ReadStoredJson(timeSlotsSetting?.Value, DefaultTimeSlotsJson);

    return Results.Ok(new
    {
        success = true,
        data = new
        {
            tenant = tenantContext.CurrentTenant,
            branding = brandingObj,
            timeSlots = timeSlotsObj
        }
    });
});

app.MapPut("/api/v1/branding", [Authorize(Roles = "TENANT_ADMIN")] async (HttpContext context, TenantContext tenantContext) =>
{
    var tenantDb = tenantContext.DbContext;
    if (tenantDb == null) return Results.BadRequest("Database unresolved");

    var claimTenantId = context.User.FindFirst("TenantId")?.Value;
    if (claimTenantId != tenantContext.CurrentTenant?.TenantId)
    {
        return Results.Json(new { success = false, error = new { code = "FORBIDDEN", message = "Cross-tenant access forbidden" } }, statusCode: 403);
    }

    var body = await ReadSettingsJsonBodyAsync(context);
    if (body.Error != null) return body.Error;

    using var document = JsonDocument.Parse(body.Value);
    var root = document.RootElement;

    if (root.TryGetProperty("branding", out var brandingProp))
    {
        var bSetting = await tenantDb.Settings.FindAsync("branding");
        var bVal = brandingProp.GetRawText();
        if (bSetting == null)
        {
            bSetting = new Setting { Key = "branding", Value = bVal };
            await tenantDb.Settings.AddAsync(bSetting);
        }
        else
        {
            bSetting.Value = bVal;
        }
    }

    if (root.TryGetProperty("timeSlots", out var tsProp) || root.TryGetProperty("time_slots", out tsProp))
    {
        var tsSetting = await tenantDb.Settings.FindAsync("time_slots");
        var tsVal = tsProp.GetRawText();
        if (tsSetting == null)
        {
            tsSetting = new Setting { Key = "time_slots", Value = tsVal };
            await tenantDb.Settings.AddAsync(tsSetting);
        }
        else
        {
            tsSetting.Value = tsVal;
        }
    }

    await tenantDb.SaveChangesAsync();
    return Results.Ok(new { success = true, message = "Pengaturan branding dan jam operasional berhasil diperbarui." });
});

// --- Reservation Routes (Public customer booking endpoints) ---
app.MapPost("/api/v1/reservations", async (CreateReservationDto dto, TenantContext tenantContext) =>
{
    var tenantDb = tenantContext.DbContext;
    if (tenantDb == null) return Results.BadRequest("Database unresolved");

    // Accept both the canonical (`name`) and alias (`guestName`) field shapes so
    // existing clients keep working after the booking form contract changed.
    var guestName = dto.ResolvedName?.Trim() ?? string.Empty;
    var guestEmail = dto.ResolvedEmail?.Trim() ?? string.Empty;
    var guestPhone = dto.ResolvedPhone?.Trim() ?? string.Empty;

    if (string.IsNullOrWhiteSpace(guestName) || string.IsNullOrWhiteSpace(guestEmail) ||
        string.IsNullOrWhiteSpace(guestPhone) || string.IsNullOrWhiteSpace(dto.StartTime) ||
        string.IsNullOrWhiteSpace(dto.EndTime))
    {
        return Results.Json(new { success = false, error = new { code = "BAD_REQUEST", message = "Semua kolom data diri dan waktu reservasi wajib diisi." } }, statusCode: 400);
    }

    // 1. Validate every client-supplied value (allowlist / strict bounds).
    if (guestName.Length > 100 || guestEmail.Length > 255 || guestPhone.Length > 50)
    {
        return Results.Json(new { success = false, error = new { code = "BAD_REQUEST", message = "Panjang data pemesan melebihi batas yang diizinkan." } }, statusCode: 400);
    }

    if (!System.Text.RegularExpressions.Regex.IsMatch(guestEmail, @"^[^@\s]+@[^@\s]+\.[^@\s]{2,}$"))
    {
        return Results.Json(new { success = false, error = new { code = "BAD_REQUEST", message = "Format alamat email tidak valid." } }, statusCode: 400);
    }

    if (dto.GuestCount < 1 || dto.GuestCount > 50)
    {
        return Results.Json(new { success = false, error = new { code = "BAD_REQUEST", message = "Jumlah tamu harus antara 1 sampai 50 orang." } }, statusCode: 400);
    }

    if ((dto.Notes ?? string.Empty).Length > 500)
    {
        return Results.Json(new { success = false, error = new { code = "BAD_REQUEST", message = "Catatan reservasi maksimal 500 karakter." } }, statusCode: 400);
    }

    // 2. Parse times
    if (!TimeSpan.TryParse(dto.StartTime, out var startTime) || !TimeSpan.TryParse(dto.EndTime, out var endTime) || endTime <= startTime)
    {
        return Results.Json(new { success = false, error = new { code = "BAD_REQUEST", message = "Format jam mulai dan jam selesai tidak valid." } }, statusCode: 400);
    }

    if (dto.Date == default)
    {
        return Results.Json(new { success = false, error = new { code = "BAD_REQUEST", message = "Tanggal reservasi wajib diisi." } }, statusCode: 400);
    }

    // PostgreSQL 'timestamp with time zone' columns reject DateTime values whose
    // Kind is Unspecified, so normalise the booking date to UTC before it ever
    // reaches the provider.
    var rsvDate = DateTime.SpecifyKind(dto.Date.Date, DateTimeKind.Utc);
    var todayUtc = DateTime.UtcNow.Date;
    if (rsvDate < todayUtc.AddDays(-1) || rsvDate > todayUtc.AddDays(365))
    {
        return Results.Json(new { success = false, error = new { code = "BAD_REQUEST", message = "Tanggal reservasi berada di luar rentang yang diizinkan." } }, statusCode: 400);
    }

    // Serialisable transaction: two concurrent requests for the same table and
    // slot can never both succeed (PRD §45, §46).
    await using var reservationTx = tenantDb.Database.IsRelational()
        ? await tenantDb.Database.BeginTransactionAsync(IsolationLevel.Serializable)
        : null;

    // 3. Verify and assign Table
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

    // 4. Find or Create Customer
    var customer = await tenantDb.Customers.FirstOrDefaultAsync(c => c.Email == guestEmail);
    if (customer == null)
    {
        customer = new Customer
        {
            Id = $"cust-{Guid.NewGuid().ToString("n").Substring(0, 10)}",
            Name = guestName,
            Email = guestEmail,
            Phone = guestPhone,
            CreatedAt = DateTime.UtcNow
        };
        await tenantDb.Customers.AddAsync(customer);
    }
    else
    {
        customer.Name = guestName;
        customer.Phone = guestPhone;
    }

    // 5. Create Reservation
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

    if (reservationTx != null)
    {
        await reservationTx.CommitAsync();
    }

    return Results.Ok(new { success = true, data = reservation });
}).RequireRateLimiting("booking");

app.MapGet("/api/v1/reservations", async (string? date, HttpContext context, TenantContext tenantContext) =>
{
    var tenantDb = tenantContext.DbContext;
    if (tenantDb == null) return Results.BadRequest("Database unresolved");

    IQueryable<Reservation> query = tenantDb.Reservations;
    if (!string.IsNullOrEmpty(date) && DateTime.TryParse(date, out var parsedDate))
    {
        // Same UTC normalisation as the write path: PostgreSQL timestamptz
        // cannot be compared against an Unspecified DateTime parameter.
        var dateOnly = DateTime.SpecifyKind(parsedDate.Date, DateTimeKind.Utc);
        query = query.Where(r => r.Date == dateOnly);
    }

    query = query.Where(r => r.Status != "CANCELLED" && r.Status != "REJECTED");

    // Authenticated tenant staff receive full operational detail. Anonymous
    // callers (the public booking availability check) receive a minimal,
    // non-personal projection only - internal notes and customer identifiers
    // are never exposed to them.
    var isStaff = context.User?.Identity?.IsAuthenticated == true;
    if (isStaff)
    {
        var fullList = await query.ToListAsync();
        return Results.Ok(new { success = true, data = fullList });
    }

    var publicList = await query
        .Select(r => new
        {
            r.Id,
            r.ReservationNumber,
            r.TableId,
            r.Date,
            r.StartTime,
            r.EndTime,
            r.GuestCount,
            r.Status,
            r.PaymentStatus
        })
        .ToListAsync();

    return Results.Ok(new { success = true, data = publicList });
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

    return Results.Ok(new
    {
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
    var status = document.RootElement.TryGetProperty("status", out var statusProp)
        ? statusProp.GetString()?.Trim().ToUpperInvariant()
        : null;

    var allowedStatuses = new[] { "PENDING", "CONFIRMED", "ARRIVED", "SEATED", "COMPLETED", "CANCELLED", "NO_SHOW", "EXPIRED" };
    if (string.IsNullOrWhiteSpace(status) || !allowedStatuses.Contains(status))
    {
        return Results.Json(new { success = false, error = new { code = "BAD_REQUEST", message = "Status reservasi tidak dikenal." } }, statusCode: 400);
    }

    var rsv = await tenantDb.Reservations.FindAsync(id);
    if (rsv == null)
    {
        return Results.Json(new { success = false, error = new { code = "NOT_FOUND", message = "Reservasi tidak ditemukan." } }, statusCode: 404);
    }

    rsv.Status = status;
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
    var paymentStatus = document.RootElement.TryGetProperty("paymentStatus", out var paymentProp)
        ? paymentProp.GetString()?.Trim().ToUpperInvariant()
        : null;

    var allowedPaymentStatuses = new[] { "UNPAID", "PENDING", "PAID", "REFUNDED", "FAILED", "EXPIRED" };
    if (string.IsNullOrWhiteSpace(paymentStatus) || !allowedPaymentStatuses.Contains(paymentStatus))
    {
        return Results.Json(new { success = false, error = new { code = "BAD_REQUEST", message = "Status pembayaran tidak dikenal." } }, statusCode: 400);
    }

    var rsv = await tenantDb.Reservations.FindAsync(id);
    if (rsv == null)
    {
        return Results.Json(new { success = false, error = new { code = "NOT_FOUND", message = "Reservasi tidak ditemukan." } }, statusCode: 404);
    }

    rsv.PaymentStatus = paymentStatus;
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

    /// <summary>
    /// Booking payload. Both the canonical field names and the legacy
    /// "guest*" aliases are accepted so older clients keep working.
    /// </summary>
    public class CreateReservationDto
    {
        public string? TableId { get; set; }

        public string? Name { get; set; }
        public string? GuestName { get; set; }

        public string? Email { get; set; }
        public string? GuestEmail { get; set; }

        public string? Phone { get; set; }
        public string? GuestPhone { get; set; }

        public DateTime Date { get; set; }
        public string? StartTime { get; set; }
        public string? EndTime { get; set; }
        public int GuestCount { get; set; }
        public string? Notes { get; set; }

        public string? ResolvedName => !string.IsNullOrWhiteSpace(Name) ? Name : GuestName;
        public string? ResolvedEmail => !string.IsNullOrWhiteSpace(Email) ? Email : GuestEmail;
        public string? ResolvedPhone => !string.IsNullOrWhiteSpace(Phone) ? Phone : GuestPhone;
    }
}
