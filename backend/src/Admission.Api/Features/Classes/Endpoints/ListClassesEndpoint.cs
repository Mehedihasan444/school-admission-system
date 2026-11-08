using Admission.Features.Classes.Application;
using Admission.Features.Classes.Contracts;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;

namespace Admission.Features.Classes.Endpoints;

/// <summary>
/// <c>GET /classes</c> (PRD 5.2). Returns all classes with derived seat counts.
/// </summary>
public static class ListClassesEndpoint
{
  public static void Map(IEndpointRouteBuilder app) =>
      app.MapGet("/classes", Handle);

  private static async Task<IResult> Handle(
      ClassQueryService query,
      CancellationToken ct)
  {
    var classes = await query.ListAsync(ct);
    return Results.Ok(classes);
  }
}
