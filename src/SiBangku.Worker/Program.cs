using Microsoft.EntityFrameworkCore;
using SiBangku.Db;
using SiBangku.Worker;

var builder = Host.CreateApplicationBuilder(args);

// Load environment variables
builder.Configuration.AddEnvironmentVariables();

var rawControlDbUrl = builder.Configuration["CONTROL_DATABASE_URL"] ??
                      "Host=localhost;Database=sibangku_control;Username=sibangku;Password=sibangku_dev";
var controlDbUrl = PostgresConnectionHelper.NormalizeConnectionString(rawControlDbUrl, !builder.Environment.IsDevelopment()).ConnectionString;

// Register Control DB
builder.Services.AddDbContext<ControlDbContext>(options => options.UseNpgsql(controlDbUrl));

builder.Services.AddHostedService<Worker>();

var host = builder.Build();
host.Run();
