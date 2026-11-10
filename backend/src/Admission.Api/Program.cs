using Admission.Features.Classes;
using Admission.Features.Holds;
using Admission.Infrastructure.Persistence;
using Admission.Common;
using Admission.Common.Http;
using Admission.Common.Options;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Microsoft.AspNetCore.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;

var builder = WebApplication.CreateBuilder(args);

builder.Services
    .AddPersistence(builder.Configuration)
    .AddSharedInfrastructure(builder.Configuration)
    .AddClassesModule()
    .AddHoldsModule();

builder.Services.Configure<JsonOptions>(options =>
{
  // Hold statuses travel as upper-case contract values: HELD, CONFIRMED,
  // EXPIRED, CANCELLED.
  options.SerializerOptions.Converters.Add(
      new JsonStringEnumConverter(JsonNamingPolicy.SnakeCaseUpper));
});

var app = builder.Build();

// Validate configured options and fail fast instead of on the first request.
_ = app.Services.GetRequiredService<IOptions<AdmissionOptions>>().Value;

var logger = app.Services.GetRequiredService<ILogger<DatabaseInitializer>>();
await app.InitializeDatabaseAsync(logger, app.Lifetime.ApplicationStopping);
app.UseSharedMiddleware();
app.MapClassesEndpoints().MapHoldsEndpoints();
app.MapGet("/health", HealthEndpoint.Handle);
app.Run();

public partial class Program;
