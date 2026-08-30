using System;
using Microsoft.AspNetCore.Builder;
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

var app = builder.Build();

// Configure the HTTP request pipeline.
if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/Error", createScopeForErrors: true);
    app.UseHsts();
}

app.UseHttpsRedirection();
app.UseAntiforgery();
app.MapStaticAssets();

app.MapRazorComponents<App>()
    .AddInteractiveServerRenderMode();

app.Run();
