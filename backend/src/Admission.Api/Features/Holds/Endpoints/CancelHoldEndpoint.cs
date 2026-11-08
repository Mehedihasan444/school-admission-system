using Admission.Common.Http;
using Admission.Features.Holds.Application;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;

namespace Admission.Features.Holds.Endpoints;

/// <summary>
/// <c>DELETE /holds/{holdId}</c> (PRD 5.7). Requires <c>X-Student-Id</c>. Success: 204 no body.
/// </summary>
public static class CancelHoldEndpoint
{
  public static void Map(IEndpointRouteBuilder app)
  {
    app.MapDelete("/holds/{holdId}", Handle)
        .AddEndpointFilter<StudentIdFilter>();
  }

  private static async Task<IResult> Handle(
      string holdId,
      StudentIdContext studentIdContext,
      CancelHoldHandler handler,
      CancellationToken ct)
  {
    await handler.Handle(holdId, studentIdContext.StudentId!, ct);
    return Results.NoContent();
  }
}
