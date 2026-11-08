using Admission.Common.Errors;
using Admission.Common.Http;
using Admission.Common.Options;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;

namespace Admission.Common;

public static class SharedInfrastructureModule
{
  public static IServiceCollection AddSharedInfrastructure(
      this IServiceCollection services,
      IConfiguration configuration)
  {
    services.AddOptions<AdmissionOptions>()
        .Bind(configuration.GetSection(AdmissionOptions.SectionName))
        .ValidateDataAnnotations()
        .Validate(options => options.HoldDurationSeconds > 0, "HoldDurationSeconds must be positive.")
        .Validate(options => options.ExpirySweepSeconds > 0, "ExpirySweepSeconds must be positive.");

    // The plain HOLD_DURATION_SECONDS env name (PRD section 9) overrides
    // any value bound from configuration sources.
    services.PostConfigure<AdmissionOptions>(options =>
    {
      var holdDurationEnv = Environment.GetEnvironmentVariable("HOLD_DURATION_SECONDS");
      if (!string.IsNullOrEmpty(holdDurationEnv) &&
              int.TryParse(holdDurationEnv, out var holdDuration) && holdDuration > 0)
      {
        options.HoldDurationSeconds = holdDuration;
      }
    });

    services.AddSingleton(TimeProvider.System);
    services.AddSingleton<StudentIdContext>();
    services.AddHttpContextAccessor();
    services.AddExceptionHandler<GlobalExceptionHandler>();
    services.AddProblemDetails();

    services.AddCors(options =>
    {
      options.AddPolicy("cors", policy =>
          {
            policy.WithOrigins(LoadAllowedOrigins(configuration))
                    .AllowAnyHeader()
                    .AllowAnyMethod();
          });
    });

    return services;
  }

  private static string[] LoadAllowedOrigins(IConfiguration configuration) =>
      configuration.GetSection($"{AdmissionOptions.SectionName}:{nameof(AdmissionOptions.CorsAllowedOrigins)}")
          .Get<string[]>() ?? ["http://localhost:3000"];
}
