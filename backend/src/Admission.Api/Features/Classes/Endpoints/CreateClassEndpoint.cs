using Admission.Features.Classes.Application;
using Admission.Features.Classes.Contracts;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;

namespace Admission.Features.Classes.Endpoints;

/// <summary>
/// <c>POST /classes</c> (PRD 5.1). Thin: parse body, call one handler, map result.
/// </summary>
public static class CreateClassEndpoint
{
  public static void Map(IEndpointRouteBuilder app) =>
      app.MapPost("/classes", Handle);

  private static async Task<IResult> Handle(
      CreateClassRequest request,
      CreateClassHandler handler,
      CancellationToken ct)
  {
    var response = await handler.Handle(request, ct);
    return Results.Created($"/classes/{response.Id}", response);
  }
}
