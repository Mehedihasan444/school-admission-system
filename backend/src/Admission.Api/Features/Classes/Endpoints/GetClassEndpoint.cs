using Admission.Common.Errors;
using Admission.Common.Http;
using Admission.Features.Classes.Application;
using Admission.Features.Classes.Contracts;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;

namespace Admission.Features.Classes.Endpoints;

/// <summary>
/// <c>GET /classes/{classId}</c>. Invalid GUID -> 404 CLASS_NOT_FOUND.
/// </summary>
public static class GetClassEndpoint
{
  public static void Map(IEndpointRouteBuilder app) =>
      app.MapGet("/classes/{classId}", Handle);

  private static async Task<IResult> Handle(
      string classId,
      ClassQueryService query,
      CancellationToken ct)
  {
    if (!RouteParsing.TryParseId(classId, out var id))
    {
      return Results.NotFound(new ErrorResponse(new ErrorBody(ErrorCodes.ClassNotFound, ErrorMessages.ClassNotFound)));
    }

    var response = await query.GetAsync(id, ct);
    if (response is null)
    {
      return Results.NotFound(new ErrorResponse(new ErrorBody(ErrorCodes.ClassNotFound, ErrorMessages.ClassNotFound)));
    }

    return Results.Ok(response);
  }
}
