using System;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
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

app.UseAntiforgery();
app.MapStaticAssets();

app.MapRazorComponents<App>()
    .AddInteractiveServerRenderMode();

app.Run();
