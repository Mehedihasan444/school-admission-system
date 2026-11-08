namespace Admission.Features.Classes;

public static class ClassesModule
{
  public static IServiceCollection AddClassesModule(this IServiceCollection services) => services;

  public static IEndpointRouteBuilder MapClassesEndpoints(this IEndpointRouteBuilder app) => app;
}
