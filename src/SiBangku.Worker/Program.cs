using Microsoft.EntityFrameworkCore;
using SiBangku.Db;
using SiBangku.Worker;

var builder = Host.CreateApplicationBuilder(args);

// Load environment variables
builder.Configuration.AddEnvironmentVariables();

var controlDbUrl = builder.Configuration["CONTROL_DATABASE_URL"] ?? 
                   "Host=localhost;Database=sibangku_control;Username=sibangku;Password=sibangku_dev";

// Register Control DB
builder.Services.AddDbContext<ControlDbContext>(options => options.UseNpgsql(controlDbUrl));

builder.Services.AddHostedService<Worker>();

var host = builder.Build();
host.Run();
