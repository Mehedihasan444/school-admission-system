namespace Admission.Features.Holds;

public static class HoldsModule
{
  public static IServiceCollection AddHoldsModule(this IServiceCollection services) => services;

  public static IEndpointRouteBuilder MapHoldsEndpoints(this IEndpointRouteBuilder app) => app;
}
