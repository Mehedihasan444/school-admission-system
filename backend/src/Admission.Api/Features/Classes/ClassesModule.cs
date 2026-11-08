using Admission.Features.Classes.Application;
using Admission.Features.Classes.Endpoints;
using Admission.Features.Classes.Validation;
using Microsoft.Extensions.DependencyInjection;

namespace Admission.Features.Classes;

public static class ClassesModule
{
  public static IServiceCollection AddClassesModule(this IServiceCollection services) =>
      services
          .AddScoped<CreateClassHandler>()
          .AddScoped<ClassQueryService>()
          .AddScoped<CreateClassRequestValidator>();

  public static IEndpointRouteBuilder MapClassesEndpoints(this IEndpointRouteBuilder app)
  {
    CreateClassEndpoint.Map(app);
    ListClassesEndpoint.Map(app);
    GetClassEndpoint.Map(app);
    return app;
  }
}
