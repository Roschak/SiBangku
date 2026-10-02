using System;
using System.IO;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.StaticFiles;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using SiBangku.Web.Components;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddRazorComponents()
    .AddInteractiveServerComponents();

// Configure dynamic HTTP clients pointing to backend APIs
builder.Services.AddHttpClient("ControlApi", client =>
{
    client.BaseAddress = new Uri(builder.Configuration["CONTROL_API_URL"] ?? "http://localhost:3001");
});

builder.Services.AddHttpClient("TenantApi", client =>
{
    client.BaseAddress = new Uri(builder.Configuration["TENANT_API_URL"] ?? "http://localhost:3002");
});

builder.Services.AddScoped<SiBangku.Web.Services.LanguageService>();

var app = builder.Build();

// Configure the HTTP request pipeline.
if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/Error", createScopeForErrors: true);
    app.UseHsts();
}

// Defensive security headers. Blazor Server renders inline styles/scripts and
// connects over WebSockets, so the policy below is the strictest set that keeps
// the application fully functional (no functionality is disabled by these).
app.Use(async (context, next) =>
{
    var headers = context.Response.Headers;

    headers["X-Content-Type-Options"] = "nosniff";
    headers["X-Frame-Options"] = "DENY";
    headers["Referrer-Policy"] = "strict-origin-when-cross-origin";
    // The QR scanner needs the camera; nothing else is granted.
    headers["Permissions-Policy"] = "camera=(self), microphone=(), geolocation=(), payment=()";

    headers["Content-Security-Policy"] =
        "default-src 'self'; " +
        // Blazor Server bootstraps with an inline script; unsafe-inline is required.
        "script-src 'self' 'unsafe-inline'; " +
        // Inline style attributes are used extensively throughout the UI kit.
        "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://fonts.googleapis.com; " +
        "font-src 'self' data: https://cdn.jsdelivr.net https://fonts.gstatic.com; " +
        "img-src 'self' data: blob:; " +
        // Blazor Server communicates over SignalR (websocket / long polling).
        "connect-src 'self' ws: wss:; " +
        "object-src 'none'; " +
        "base-uri 'self'; " +
        "form-action 'self'";
    // Note: Blazor Server's antiforgery middleware already emits
    // `Content-Security-Policy: frame-ancestors 'self'`. Adding frame-ancestors
    // here as well would send two CSP headers whose directives intersect; the
    // X-Frame-Options header above (DENY) is the clickjacking control instead.

    headers.Remove("Server");

    await next();
});

// Setup MIME type mappings for downloadable binaries & data files
var contentTypeProvider = new FileExtensionContentTypeProvider();
contentTypeProvider.Mappings[".apk"] = "application/vnd.android.package-archive";
contentTypeProvider.Mappings[".exe"] = "application/vnd.microsoft.portable-executable";
contentTypeProvider.Mappings[".bat"] = "application/x-bat";
contentTypeProvider.Mappings[".zip"] = "application/zip";
contentTypeProvider.Mappings[".csv"] = "text/csv";

app.UseStaticFiles(new StaticFileOptions
{
    ContentTypeProvider = contentTypeProvider
});

app.UseAntiforgery();
app.MapStaticAssets();

// Universal Download Endpoints with Fallback & Direct Binary Streaming
app.MapGet("/download/apk/{tenantCode?}", async (string? tenantCode, IHttpClientFactory httpFactory, IWebHostEnvironment env) =>
{
    var code = string.IsNullOrWhiteSpace(tenantCode) ? "UNIVERSAL" : tenantCode.Trim().ToUpperInvariant();
    try
    {
        var client = httpFactory.CreateClient("ControlApi");
        var response = await client.GetAsync($"/api/v1/tenants/{code}/apk");
        if (response.IsSuccessStatusCode)
        {
            var stream = await response.Content.ReadAsStreamAsync();
            return Results.File(stream, "application/vnd.android.package-archive", $"SiBangku-{code}.apk");
        }
    }
    catch { }

    var localFallback = Path.Combine(env.WebRootPath, "downloads", "SiBangku-Universal-App.apk");
    if (File.Exists(localFallback))
    {
        var bytes = await File.ReadAllBytesAsync(localFallback);
        return Results.File(bytes, "application/vnd.android.package-archive", $"SiBangku-{code}.apk");
    }

    return Results.NotFound(new { error = "File APK belum tersedia." });
});

app.MapGet("/download/exe/{tenantCode?}", async (string? tenantCode, IHttpClientFactory httpFactory, IWebHostEnvironment env) =>
{
    var code = string.IsNullOrWhiteSpace(tenantCode) ? "UNIVERSAL" : tenantCode.Trim().ToUpperInvariant();
    try
    {
        var client = httpFactory.CreateClient("ControlApi");
        var response = await client.GetAsync($"/api/v1/tenants/{code}/exe");
        if (response.IsSuccessStatusCode)
        {
            var stream = await response.Content.ReadAsStreamAsync();
            return Results.File(stream, "application/vnd.microsoft.portable-executable", $"SiBangku-{code}.exe");
        }
    }
    catch { }

    var localFallback = Path.Combine(env.WebRootPath, "downloads", "SiBangku-Desktop-App.exe");
    if (File.Exists(localFallback))
    {
        var bytes = await File.ReadAllBytesAsync(localFallback);
        return Results.File(bytes, "application/vnd.microsoft.portable-executable", $"SiBangku-{code}.exe");
    }

    return Results.NotFound(new { error = "File Desktop EXE belum tersedia." });
});

app.MapGet("/download/package/{tenantCode?}", async (string? tenantCode, IHttpClientFactory httpFactory, IWebHostEnvironment env) =>
{
    var code = string.IsNullOrWhiteSpace(tenantCode) ? "UNIVERSAL" : tenantCode.Trim().ToUpperInvariant();
    try
    {
        var client = httpFactory.CreateClient("ControlApi");
        var response = await client.GetAsync($"/api/v1/tenants/{code}/package");
        if (response.IsSuccessStatusCode)
        {
            var stream = await response.Content.ReadAsStreamAsync();
            return Results.File(stream, "application/zip", $"SiBangku-{code}-package.zip");
        }
    }
    catch { }

    return Results.NotFound(new { error = "Paket workspace belum siap." });
});

app.MapGet("/download/bat/{tenantCode?}", (string? tenantCode, HttpContext ctx) =>
{
    var code = string.IsNullOrWhiteSpace(tenantCode) ? "DEFAULT" : tenantCode.Trim().ToUpperInvariant();
    var host = ctx.Request.Host.Value;
    var scheme = ctx.Request.Scheme;
    var url = $"{scheme}://{host}/tenant-admin?tenant={code}";
    var batContent = $@"@echo off
title SiBangku Desktop POS - {code}
echo ========================================================
echo   SiBangku POS Launcher - Tenant [{code}]
echo   Membuka portal kasir & manajemen meja...
echo ========================================================
start msedge --app=""{url}"" 2>nul || start chrome --app=""{url}"" 2>nul || start """" ""{url}""
exit
";
    return Results.File(System.Text.Encoding.UTF8.GetBytes(batContent), "application/x-bat", $"SiBangku-Launcher-{code.ToLowerInvariant()}.bat");
});

app.MapRazorComponents<App>()
    .AddInteractiveServerRenderMode();

app.Run();
