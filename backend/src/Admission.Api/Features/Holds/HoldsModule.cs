using Admission.Features.Holds.Application;
using Admission.Features.Holds.Endpoints;
using Admission.Features.Holds.Expiry;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

namespace Admission.Features.Holds;

public static class HoldsModule
{
  public static IServiceCollection AddHoldsModule(this IServiceCollection services) =>
      services
          .AddScoped<ApplyHoldHandler>()
          .AddScoped<ConfirmHoldHandler>()
          .AddScoped<CancelHoldHandler>()
          .AddScoped<HoldQueryService>()
          .AddScoped<ExpirySweeper>()
          .AddHostedService<HoldExpiryWorker>();

  public static IEndpointRouteBuilder MapHoldsEndpoints(this IEndpointRouteBuilder app)
  {
    ApplyHoldEndpoint.Map(app);
    GetHoldEndpoint.Map(app);
    ConfirmHoldEndpoint.Map(app);
    CancelHoldEndpoint.Map(app);
    MyHoldsEndpoint.Map(app);
    return app;
  }
}
