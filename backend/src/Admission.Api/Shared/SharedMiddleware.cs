using Microsoft.AspNetCore.Builder;

namespace Admission.Common;

public static class SharedMiddleware
{
  public static IApplicationBuilder UseSharedMiddleware(this IApplicationBuilder app)
  {
    app.UseExceptionHandler();
    app.UseCors("cors");
    return app;
  }
}
