using System;
using System.IO;
using System.Linq;
using System.Security.Claims;
using System.Security.Cryptography;
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
using Npgsql;
using SiBangku.Db;
using SiBangku.ControlApi.Services;
using SiBangku.Shared.Models;
using SiBangku.Shared.Security;
using System.IdentityModel.Tokens.Jwt;

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
            "JWT_SECRET is not configured. Set the JWT_SECRET environment variable before starting the Control API.");
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

// Dedicated key for host/CLI privileged endpoints (X-Master-Key). Keeping it
// separate from the JWT signing secret limits the blast radius if either leaks.
var masterApiKey = builder.Configuration["MASTER_API_KEY"];
if (string.IsNullOrWhiteSpace(masterApiKey))
{
    if (!builder.Environment.IsDevelopment())
    {
        throw new InvalidOperationException(
            "MASTER_API_KEY is not configured. Set the MASTER_API_KEY environment variable before starting the Control API.");
    }
    masterApiKey = "dev-only-insecure-master-key";
}

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

// 3b. Rate limiting for credential endpoints (brute-force mitigation).
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
    // The default 'admin/admin' developer account is only ever seeded for local
    // development - never in a deployed environment (PRD section 5).
    await ControlDbSeeder.SeedAsync(context, seedDevelopmentAccount: app.Environment.IsDevelopment());
}

// 7. Defensive security response headers for every API response.
app.Use(async (context, next) =>
{
    var headers = context.Response.Headers;
    headers["X-Content-Type-Options"] = "nosniff";
    headers["X-Frame-Options"] = "DENY";
    headers["Referrer-Policy"] = "no-referrer";
    headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()";
    headers["Cross-Origin-Resource-Policy"] = "same-site";
    headers.Remove("Server");
    await next();
});

app.UseCors("SiBangkuCors");
app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();

// ==========================================
// API ENDPOINTS
// ==========================================

// Constant-time comparison so the privileged master key cannot be recovered
// through response-timing analysis.
static bool IsValidMasterKey(HttpContext context, string expectedKey)
{
    var provided = context.Request.Headers["X-Master-Key"].FirstOrDefault();
    if (string.IsNullOrEmpty(provided) || string.IsNullOrEmpty(expectedKey))
    {
        return false;
    }

    return CryptographicOperations.FixedTimeEquals(
        Encoding.UTF8.GetBytes(provided),
        Encoding.UTF8.GetBytes(expectedKey));
}

// Uniform response for a password that fails the platform policy, so every
// endpoint reports the exact unmet requirement instead of a generic failure.
static IResult WeakPasswordResult(PasswordPolicyResult result) =>
    Results.Json(new { success = false, error = new { code = "WEAK_PASSWORD", message = result.ErrorSummary } }, statusCode: 400);

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

        var email = (root.TryGetProperty("email", out var emailProp) ? emailProp.GetString() : null)?.Trim() ?? string.Empty;
        var password = root.TryGetProperty("password", out var passwordProp) ? passwordProp.GetString() ?? string.Empty : string.Empty;

        if (string.IsNullOrWhiteSpace(email) || string.IsNullOrWhiteSpace(password))
        {
            return Results.Json(new { success = false, error = new { code = "BAD_REQUEST", message = "Email/Username dan password wajib diisi." } }, statusCode: 400);
        }

        // Check if platform admin is initialized
        if (!await db.PlatformUsers.AnyAsync())
        {
            return Results.Json(new { success = false, error = new { code = "NO_ADMIN_CONFIGURED", message = "Belum ada akun Administrator. Silakan klik 'Atur Ulang / Buat Akun Sendiri' untuk membuat akun baru." } }, statusCode: 400);
        }

        // Case-insensitive lookup by Email, UserId, or Name
        var user = await db.PlatformUsers.FirstOrDefaultAsync(u =>
            u.Email.ToLower() == email.ToLower() ||
            u.UserId.ToLower() == email.ToLower() ||
            u.Name.ToLower() == email.ToLower());

        if (user == null || !PasswordHasher.Verify(password, user.PasswordHash))
        {
            // Security observability: record the failed attempt without ever logging the password.
            try
            {
                await db.AuditLogs.AddAsync(new AuditLog
                {
                    Id = $"aud-{Guid.NewGuid():N}",
                    TenantId = "platform",
                    Action = "login failed",
                    UserId = email.Length > 128 ? email[..128] : email,
                    Details = "{\"reason\":\"invalid credentials\"}",
                    CreatedAt = DateTime.UtcNow
                });
                await db.SaveChangesAsync();
            }
            catch { /* never let audit logging break authentication */ }

            return Results.Json(new { success = false, error = new { code = "AUTH_FAILED", message = "Kredensial tidak valid. Pastikan username dan password benar." } }, statusCode: 401);
        }

        // Transparently upgrade legacy hashes (BCrypt or weaker Argon2 settings) to
        // the current Argon2id parameters on every successful sign-in.
        if (PasswordHasher.NeedsRehash(user.PasswordHash))
        {
            try
            {
                user.PasswordHash = PasswordHasher.Hash(password);
                await db.SaveChangesAsync();
            }
            catch { /* a hashing upgrade must never block a valid sign-in */ }
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
    }
}).RequireRateLimiting("auth");

app.MapGet("/api/v1/auth/profile", [Authorize(Roles = "SUPER_ADMIN")] async (HttpContext context, ControlDbContext db) =>
{
    var userId = context.User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
    var user = await db.PlatformUsers.FindAsync(userId);
    if (user == null)
    {
        return Results.Json(new { success = false, error = new { code = "NOT_FOUND", message = "User admin tidak ditemukan." } }, statusCode: 404);
    }

    return Results.Ok(new
    {
        success = true,
        data = new
        {
            userId = user.UserId,
            email = user.Email,
            name = user.Name,
            role = user.Role
        }
    });
});

app.MapPut("/api/v1/auth/profile", [Authorize(Roles = "SUPER_ADMIN")] async (HttpContext context, ControlDbContext db) =>
{
    using var document = await JsonDocument.ParseAsync(context.Request.Body);
    var root = document.RootElement;

    var name = root.TryGetProperty("name", out var nameProp) ? nameProp.GetString() : null;
    var email = root.TryGetProperty("email", out var emailProp) ? emailProp.GetString() : null;

    var userId = context.User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
    var user = await db.PlatformUsers.FindAsync(userId);
    if (user == null)
    {
        return Results.Json(new { success = false, error = new { code = "NOT_FOUND", message = "User admin tidak ditemukan." } }, statusCode: 404);
    }

    if (!string.IsNullOrWhiteSpace(name))
    {
        user.Name = name.Trim();
    }
    if (!string.IsNullOrWhiteSpace(email))
    {
        user.Email = email.Trim();
    }

    var audit = new AuditLog
    {
        Id = $"aud-{Guid.NewGuid():N}",
        TenantId = "platform",
        Action = "update platform profile",
        UserId = user.Email,
        Details = $"{{\"name\":\"{user.Name}\",\"email\":\"{user.Email}\"}}",
        CreatedAt = DateTime.UtcNow
    };

    await db.AuditLogs.AddAsync(audit);
    await db.SaveChangesAsync();

    return Results.Ok(new
    {
        success = true,
        message = "Profil Super Admin berhasil diperbarui.",
        data = new
        {
            userId = user.UserId,
            email = user.Email,
            name = user.Name,
            role = user.Role
        }
    });
});

app.MapPost("/api/v1/auth/change-password", [Authorize(Roles = "SUPER_ADMIN")] async (HttpContext context, ControlDbContext db) =>
{
    using var document = await JsonDocument.ParseAsync(context.Request.Body);
    var root = document.RootElement;
    var newPassword = root.TryGetProperty("newPassword", out var newPasswordProp) ? newPasswordProp.GetString() : null;

    var userId = context.User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
    var user = await db.PlatformUsers.FindAsync(userId);
    if (user == null)
    {
        return Results.Json(new { success = false, error = new { code = "NOT_FOUND", message = "User admin tidak ditemukan." } }, statusCode: 404);
    }

    var policyResult = PasswordPolicy.Validate(newPassword, user.Email);
    if (!policyResult.IsValid)
    {
        return WeakPasswordResult(policyResult);
    }

    user.PasswordHash = PasswordHasher.Hash(newPassword!);

    var audit = new AuditLog
    {
        Id = $"aud-{Guid.NewGuid():N}",
        TenantId = "platform",
        Action = "change platform password",
        UserId = user.Email,
        Details = "{\"message\":\"Super Admin password updated successfully.\"}",
        CreatedAt = DateTime.UtcNow
    };

    await db.AuditLogs.AddAsync(audit);
    await db.SaveChangesAsync();

    return Results.Ok(new { success = true, message = "Password berhasil diubah." });
});

// --- Internal Secure Admin Management for Host CLI (Protected by Master Key) ---
app.MapPost("/api/v1/internal/admin/create-or-reset", async (HttpContext context, ControlDbContext db) =>
{
    if (!IsValidMasterKey(context, masterApiKey))
    {
        return Results.Json(new { success = false, error = new { code = "FORBIDDEN", message = "Akses ditolak. Master Key tidak valid." } }, statusCode: 403);
    }

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

        var username = root.TryGetProperty("username", out var uProp) ? uProp.GetString()?.Trim() : null;
        var password = root.TryGetProperty("password", out var pProp) ? pProp.GetString() : null;
        var name = root.TryGetProperty("name", out var nProp) ? nProp.GetString()?.Trim() : "Super Admin";

        if (string.IsNullOrWhiteSpace(username) || string.IsNullOrWhiteSpace(password))
        {
            return Results.Json(new { success = false, error = new { code = "BAD_REQUEST", message = "Username dan password wajib diisi." } }, statusCode: 400);
        }

        var policyResult = PasswordPolicy.Validate(password, username);
        if (!policyResult.IsValid)
        {
            return WeakPasswordResult(policyResult);
        }

        var user = await db.PlatformUsers.FirstOrDefaultAsync(u => u.Email.ToLower() == username.ToLower());
        var hash = PasswordHasher.Hash(password);

        if (user == null)
        {
            user = new PlatformUser
            {
                UserId = "admin-" + Guid.NewGuid().ToString("n").Substring(0, 8),
                Email = username,
                PasswordHash = hash,
                Name = !string.IsNullOrWhiteSpace(name) ? name : "Super Admin",
                Role = "SUPER_ADMIN",
                CreatedAt = DateTime.UtcNow
            };
            await db.PlatformUsers.AddAsync(user);
        }
        else
        {
            user.PasswordHash = hash;
            if (!string.IsNullOrWhiteSpace(name)) user.Name = name;
        }

        var audit = new AuditLog
        {
            Id = $"aud-{Guid.NewGuid():N}",
            TenantId = "platform",
            Action = "master key create/update admin",
            UserId = username,
            Details = $"{{\"username\":\"{username}\",\"name\":\"{user.Name}\"}}",
            CreatedAt = DateTime.UtcNow
        };

        await db.AuditLogs.AddAsync(audit);
        await db.SaveChangesAsync();

        return Results.Ok(new
        {
            success = true,
            message = $"Akun Super Admin '{username}' berhasil disimpan.",
            data = new { username = user.Email, name = user.Name }
        });
    }
});

app.MapGet("/api/v1/internal/admin/list", async (HttpContext context, ControlDbContext db) =>
{
    if (!IsValidMasterKey(context, masterApiKey))
    {
        return Results.Json(new { success = false, error = new { code = "FORBIDDEN", message = "Akses ditolak. Master Key tidak valid." } }, statusCode: 403);
    }

    // Never project credential material (password hashes) to callers.
    var list = await db.PlatformUsers
        .OrderByDescending(u => u.CreatedAt)
        .Select(u => new
        {
            u.UserId,
            u.Email,
            u.Name,
            u.Role,
            u.CreatedAt
        })
        .ToListAsync();

    return Results.Ok(new { success = true, data = list });
});

app.MapPost("/api/v1/internal/tenant/reset-password", async (HttpContext context, ControlDbContext db) =>
{
    if (!IsValidMasterKey(context, masterApiKey))
    {
        return Results.Json(new { success = false, error = new { code = "FORBIDDEN", message = "Akses ditolak. Master Key tidak valid." } }, statusCode: 403);
    }

    using var document = await JsonDocument.ParseAsync(context.Request.Body);
    var tenantCode = document.RootElement.TryGetProperty("tenantCode", out var tcp) ? tcp.GetString()?.Trim().ToUpperInvariant() : null;
    var newPassword = document.RootElement.TryGetProperty("newPassword", out var np) ? np.GetString() : null;

    if (string.IsNullOrWhiteSpace(tenantCode) || string.IsNullOrWhiteSpace(newPassword))
    {
        return Results.Json(new { success = false, error = new { code = "INVALID_REQUEST", message = "Kode tenant dan kata sandi baru wajib diisi." } }, statusCode: 400);
    }

    var policyResult = PasswordPolicy.Validate(newPassword, tenantCode);
    if (!policyResult.IsValid)
    {
        return WeakPasswordResult(policyResult);
    }

    var tenant = await db.Tenants.FirstOrDefaultAsync(t => t.TenantCode == tenantCode);
    if (tenant == null)
    {
        return Results.Json(new { success = false, error = new { code = "NOT_FOUND", message = $"Tenant dengan kode '{tenantCode}' tidak ditemukan." } }, statusCode: 404);
    }

    var builder = new NpgsqlConnectionStringBuilder(controlDbUrl) { Database = tenant.DatabaseIdentifier };
    var tenantOptions = new DbContextOptionsBuilder<TenantDbContext>().UseNpgsql(builder.ConnectionString).Options;

    await using var tenantDb = new TenantDbContext(tenantOptions);
    var adminUser = await tenantDb.Users.FirstOrDefaultAsync(u => u.Role == "TENANT_ADMIN" || u.Role == "RESTAURANT_ADMIN");
    if (adminUser == null)
    {
        return Results.Json(new { success = false, error = new { code = "USER_NOT_FOUND", message = "Pengguna admin tidak ditemukan di database tenant." } }, statusCode: 404);
    }

    adminUser.PasswordHash = PasswordHasher.Hash(newPassword);
    adminUser.MustChangePassword = false;
    await tenantDb.SaveChangesAsync();

    return Results.Ok(new { success = true, message = $"Kata sandi untuk admin resto '{tenant.RestaurantName}' ({adminUser.Email}) berhasil diperbarui.", adminEmail = adminUser.Email });
});

// --- Public Outlet Directory (Privacy-Preserving, No Auth Required) ---
app.MapGet("/api/v1/public/outlets", async (ControlDbContext db) =>
{
    var list = await db.Tenants
        .Where(t => t.Status == "ACTIVE" || t.Status == "TRIAL")
        .OrderBy(t => t.RestaurantName)
        .Select(t => new
        {
            tenantCode = t.TenantCode,
            restaurantName = t.RestaurantName,
            status = t.Status
        })
        .ToListAsync();
    return Results.Ok(new { success = true, data = list });
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

app.MapPost("/api/v1/tenants", [Authorize(Roles = "SUPER_ADMIN")] async (ProvisionTenantParams paramDto, ITenantProvisioner provisioner, ILogger<Program> logger) =>
{
    if (string.IsNullOrWhiteSpace(paramDto.TenantName) || string.IsNullOrWhiteSpace(paramDto.RestaurantName) || string.IsNullOrWhiteSpace(paramDto.AdminEmail))
    {
        return Results.Json(new { success = false, error = new { code = "BAD_REQUEST", message = "Nama badan usaha, nama restoran, dan email admin wajib diisi." } }, statusCode: 400);
    }

    if (paramDto.TrialDays < 1 || paramDto.TrialDays > 3650)
    {
        return Results.Json(new { success = false, error = new { code = "BAD_REQUEST", message = "Durasi trial harus antara 1 sampai 3650 hari." } }, statusCode: 400);
    }

    try
    {
        var result = await provisioner.ProvisionTenantAsync(paramDto);
        return Results.Ok(new { success = true, data = result });
    }
    catch (ArgumentException ex)
    {
        // Input rejected by the password policy (or similar validation): this is
        // actionable for the operator, so the reason is returned verbatim.
        return Results.Json(new { success = false, error = new { code = "WEAK_PASSWORD", message = ex.Message } }, statusCode: 400);
    }
    catch (Exception ex)
    {
        // Log the technical detail server-side; never return internals (stack,
        // SQL, connection strings) to the caller.
        logger.LogError(ex, "Tenant provisioning failed for '{tenantName}'.", paramDto.TenantName);
        return Results.Json(new { success = false, error = new { code = "PROVISIONING_FAILED", message = "Provisioning tenant gagal diproses. Silakan periksa log server atau hubungi administrator platform." } }, statusCode: 500);
    }
});

app.MapPatch("/api/v1/tenants/{id}/status", [Authorize(Roles = "SUPER_ADMIN")] async (string id, HttpContext context, ControlDbContext db) =>
{
    using var document = await JsonDocument.ParseAsync(context.Request.Body);
    var status = document.RootElement.TryGetProperty("status", out var statusProp)
        ? statusProp.GetString()?.Trim().ToUpperInvariant()
        : null;

    // Allowlist: never trust an arbitrary client-supplied lifecycle state.
    var allowedStatuses = new[]
    {
        "PROVISIONING", "TRIAL", "ACTIVE", "PAST_DUE", "SUSPENDED",
        "TRIAL_EXPIRED", "SUBSCRIPTION_EXPIRED", "CANCELLED", "ARCHIVED"
    };

    if (string.IsNullOrWhiteSpace(status) || !allowedStatuses.Contains(status))
    {
        return Results.Json(new { success = false, error = new { code = "INVALID_STATUS", message = "Status tenant tidak dikenal." } }, statusCode: 400);
    }

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
        Id = $"aud-{Guid.NewGuid():N}",
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
    var days = document.RootElement.TryGetProperty("days", out var daysProp) && daysProp.TryGetInt32(out var parsedDays)
        ? parsedDays
        : 0;

    if (days < 1 || days > 3650)
    {
        return Results.Json(new { success = false, error = new { code = "BAD_REQUEST", message = "Jumlah hari perpanjangan harus antara 1 sampai 3650." } }, statusCode: 400);
    }

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
        Id = $"aud-{Guid.NewGuid():N}",
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

app.MapPost("/api/v1/tenants/{id}/reset-password", [Authorize(Roles = "SUPER_ADMIN")] async (string id, HttpContext context, ControlDbContext db, IConfiguration config) =>
{
    using var document = await JsonDocument.ParseAsync(context.Request.Body);
    var newPassword = document.RootElement.TryGetProperty("newPassword", out var np) ? np.GetString() : null;

    var tenant = await db.Tenants.FindAsync(id);
    if (tenant == null)
    {
        return Results.Json(new { success = false, error = new { code = "NOT_FOUND", message = "Tenant tidak ditemukan." } }, statusCode: 404);
    }

    var policyResult = PasswordPolicy.Validate(newPassword, tenant.TenantCode);
    if (!policyResult.IsValid)
    {
        return WeakPasswordResult(policyResult);
    }

    var controlConn = controlDbUrl;
    var connBuilder = new Npgsql.NpgsqlConnectionStringBuilder(controlConn) { Database = tenant.DatabaseIdentifier };
    var tenantOptions = new DbContextOptionsBuilder<TenantDbContext>().UseNpgsql(connBuilder.ConnectionString).Options;

    await using var tenantDb = new TenantDbContext(tenantOptions);
    var adminUser = await tenantDb.Users.FirstOrDefaultAsync(u => u.Role == "TENANT_ADMIN" || u.Role == "RESTAURANT_ADMIN");
    if (adminUser == null)
    {
        adminUser = await tenantDb.Users.FirstOrDefaultAsync();
    }

    if (adminUser == null)
    {
        adminUser = new User
        {
            UserId = "tenant-admin-" + Guid.NewGuid().ToString("N")[..8],
            TenantId = tenant.TenantId,
            Email = $"admin@{tenant.TenantCode.ToLowerInvariant()}.com",
            Name = "Restaurant Owner",
            Role = "TENANT_ADMIN",
            PasswordHash = PasswordHasher.Hash(newPassword!),
            MustChangePassword = false,
            CreatedAt = DateTime.UtcNow
        };
        await tenantDb.Users.AddAsync(adminUser);
    }
    else
    {
        adminUser.PasswordHash = PasswordHasher.Hash(newPassword!);
        adminUser.MustChangePassword = false;
    }

    await tenantDb.SaveChangesAsync();

    var audit = new AuditLog
    {
        Id = $"aud-{Guid.NewGuid():N}",
        TenantId = id,
        Action = "reset tenant admin password",
        UserId = "super-admin",
        Details = $"{{\"tenantCode\":\"{tenant.TenantCode}\",\"adminEmail\":\"{adminUser.Email}\"}}",
        CreatedAt = DateTime.UtcNow
    };
    await db.AuditLogs.AddAsync(audit);
    await db.SaveChangesAsync();

    return Results.Ok(new { success = true, message = $"Kata sandi untuk admin tenant '{tenant.RestaurantName}' ({adminUser.Email}) berhasil diubah.", adminEmail = adminUser.Email });
});

app.MapPut("/api/v1/tenants/{id}", [Authorize(Roles = "SUPER_ADMIN")] async (string id, HttpContext context, ControlDbContext db) =>
{
    using var document = await JsonDocument.ParseAsync(context.Request.Body);
    var root = document.RootElement;
    var tenant = await db.Tenants.FindAsync(id);
    if (tenant == null)
    {
        return Results.Json(new { success = false, error = new { code = "NOT_FOUND", message = "Tenant tidak ditemukan." } }, statusCode: 404);
    }

    if (root.TryGetProperty("tenantName", out var tn) && !string.IsNullOrWhiteSpace(tn.GetString()))
    {
        tenant.TenantName = tn.GetString()!.Trim();
    }
    if (root.TryGetProperty("restaurantName", out var rn) && !string.IsNullOrWhiteSpace(rn.GetString()))
    {
        tenant.RestaurantName = rn.GetString()!.Trim();
    }
    tenant.UpdatedAt = DateTime.UtcNow;

    if (root.TryGetProperty("adminEmail", out var em) && !string.IsNullOrWhiteSpace(em.GetString()))
    {
        var newEmail = em.GetString()!.Trim();
        var controlConn = controlDbUrl;
        var connBuilder = new Npgsql.NpgsqlConnectionStringBuilder(controlConn) { Database = tenant.DatabaseIdentifier };
        var tenantOptions = new DbContextOptionsBuilder<TenantDbContext>().UseNpgsql(connBuilder.ConnectionString).Options;
        await using var tenantDb = new TenantDbContext(tenantOptions);
        var adminUser = await tenantDb.Users.FirstOrDefaultAsync(u => u.Role == "TENANT_ADMIN" || u.Role == "RESTAURANT_ADMIN")
                     ?? await tenantDb.Users.FirstOrDefaultAsync();
        if (adminUser != null)
        {
            adminUser.Email = newEmail;
            await tenantDb.SaveChangesAsync();
        }
    }

    var audit = new AuditLog
    {
        Id = $"aud-{Guid.NewGuid():N}",
        TenantId = id,
        Action = "update tenant details",
        UserId = "super-admin",
        Details = $"{{\"restaurantName\":\"{tenant.RestaurantName}\",\"tenantName\":\"{tenant.TenantName}\"}}",
        CreatedAt = DateTime.UtcNow
    };
    await db.AuditLogs.AddAsync(audit);
    await db.SaveChangesAsync();

    return Results.Ok(new { success = true, data = tenant });
});

app.MapPost("/api/v1/tenants/{id}/subscription", [Authorize(Roles = "SUPER_ADMIN")] async (string id, HttpContext context, ControlDbContext db) =>
{
    using var document = await JsonDocument.ParseAsync(context.Request.Body);
    var root = document.RootElement;
    var tenant = await db.Tenants.FindAsync(id);
    if (tenant == null)
    {
        return Results.Json(new { success = false, error = new { code = "NOT_FOUND", message = "Tenant tidak ditemukan." } }, statusCode: 404);
    }

    var action = root.TryGetProperty("action", out var ac) ? ac.GetString() : "extend";
    var days = root.TryGetProperty("days", out var dy) ? dy.GetInt32() : 30;
    var now = DateTime.UtcNow;

    if (action == "lock")
    {
        tenant.Status = "SUSPENDED";
        tenant.UpdatedAt = now;
    }
    else
    {
        var baseDate = (tenant.TrialEnd != null && tenant.TrialEnd > now) ? tenant.TrialEnd.Value : now;
        tenant.TrialEnd = baseDate.AddDays(days);
        tenant.Status = "ACTIVE";
        tenant.SubscriptionStatus = "ACTIVE";
        tenant.UpdatedAt = now;
    }

    var audit = new AuditLog
    {
        Id = $"aud-{Guid.NewGuid():N}",
        TenantId = id,
        Action = action == "lock" ? "lock tenant subscription" : $"activate subscription ({days} days)",
        UserId = "super-admin",
        Details = $"{{\"action\":\"{action}\",\"days\":{days},\"status\":\"{tenant.Status}\",\"newEnd\":\"{tenant.TrialEnd:O}\"}}",
        CreatedAt = now
    };
    await db.AuditLogs.AddAsync(audit);
    await db.SaveChangesAsync();

    return Results.Ok(new { success = true, data = tenant });
});

app.MapDelete("/api/v1/tenants/{id}", [Authorize(Roles = "SUPER_ADMIN")] async (string id, ControlDbContext db, ILogger<Program> logger) =>
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

            // Drop database with strict identifier validation to prevent SQL injection
            if (!System.Text.RegularExpressions.Regex.IsMatch(dbName, @"^[a-zA-Z0-9_]+$"))
            {
                return Results.Json(new { success = false, error = new { code = "INVALID_DB_NAME", message = "Nama database tidak aman atau tidak valid." } }, statusCode: 400);
            }

            var dropQuery = $"DROP DATABASE IF EXISTS \"{dbName}\"";
            await using (var dropCmd = new NpgsqlCommand(dropQuery, conn))
            {
                await dropCmd.ExecuteNonQueryAsync();
            }
        }

        // Delete records
        db.Tenants.Remove(tenant);

        var audit = new AuditLog
        {
            Id = $"aud-{Guid.NewGuid():N}",
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
        logger.LogError(ex, "Tenant destruction failed for database '{dbName}'.", dbName);
        return Results.Json(new { success = false, error = new { code = "DESTRUCTION_FAILED", message = "Penghapusan tenant gagal diproses. Silakan periksa log server." } }, statusCode: 500);
    }
});

// --- Subscription Routes ---
app.MapPost("/api/v1/subscriptions", [Authorize(Roles = "SUPER_ADMIN")] async (Subscription subDto, ControlDbContext db) =>
{
    if (string.IsNullOrWhiteSpace(subDto.TenantId))
    {
        return Results.Json(new { success = false, error = new { code = "BAD_REQUEST", message = "TenantId wajib diisi." } }, statusCode: 400);
    }

    var tenant = await db.Tenants.FindAsync(subDto.TenantId);
    if (tenant == null)
    {
        return Results.Json(new { success = false, error = new { code = "NOT_FOUND", message = "Tenant not found" } }, statusCode: 404);
    }

    var now = DateTime.UtcNow;

    // Normalize client-supplied values; server owns identity, status and money.
    subDto.StartDate = subDto.StartDate == default ? now : DateTime.SpecifyKind(subDto.StartDate, DateTimeKind.Utc);
    subDto.EndDate = subDto.EndDate == default ? now.AddDays(30) : DateTime.SpecifyKind(subDto.EndDate, DateTimeKind.Utc);
    if (subDto.EndDate <= subDto.StartDate)
    {
        return Results.Json(new { success = false, error = new { code = "BAD_REQUEST", message = "Tanggal berakhir langganan harus setelah tanggal mulai." } }, statusCode: 400);
    }

    if (subDto.Price < 0)
    {
        return Results.Json(new { success = false, error = new { code = "BAD_REQUEST", message = "Harga langganan tidak boleh negatif." } }, statusCode: 400);
    }

    // De-activate older active subscriptions for this tenant
    var activeSubs = await db.Subscriptions.Where(s => s.TenantId == subDto.TenantId && s.Status == "ACTIVE").ToListAsync();
    foreach (var oldSub in activeSubs)
    {
        oldSub.Status = "EXPIRED";
        oldSub.UpdatedAt = now;
    }

    // Save new subscription
    var subId = $"sub-{Guid.NewGuid():N}";
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
        Id = $"aud-{Guid.NewGuid():N}",
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

namespace SiBangku.ControlApi
{
    public partial class Program { }
}

