using Admission.Common.Errors;
using Admission.Common.Http;
using Admission.Features.Holds.Application;
using Admission.Features.Holds.Contracts;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;

namespace Admission.Features.Holds.Endpoints;

/// <summary>
/// <c>GET /holds/{holdId}</c>. No <c>X-Student-Id</c> required.
/// </summary>
public static class GetHoldEndpoint
{
  public static void Map(IEndpointRouteBuilder app) =>
      app.MapGet("/holds/{holdId}", Handle);

  private static async Task<IResult> Handle(
      string holdId,
      HoldQueryService query,
      CancellationToken ct)
  {
    if (!RouteParsing.TryParseId(holdId, out _))
      return Results.NotFound(new ErrorResponse(new ErrorBody(ErrorCodes.HoldNotFound, ErrorMessages.HoldNotFound)));

    var response = await query.GetAsync(holdId, ct);
    if (response is null)
      return Results.NotFound(new ErrorResponse(new ErrorBody(ErrorCodes.HoldNotFound, ErrorMessages.HoldNotFound)));

    return Results.Ok(response);
  }
}
