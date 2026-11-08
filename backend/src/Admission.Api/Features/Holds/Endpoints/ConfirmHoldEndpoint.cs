using Admission.Common.Http;
using Admission.Features.Holds.Application;
using Admission.Features.Holds.Contracts;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;

namespace Admission.Features.Holds.Endpoints;

/// <summary>
/// <c>POST /holds/{holdId}/confirm</c> (PRD 5.6). Requires <c>X-Student-Id</c>.
/// </summary>
public static class ConfirmHoldEndpoint
{
  public static void Map(IEndpointRouteBuilder app)
  {
    app.MapPost("/holds/{holdId}/confirm", Handle)
        .AddEndpointFilter<StudentIdFilter>();
  }

  private static async Task<IResult> Handle(
      string holdId,
      StudentIdContext studentIdContext,
      ConfirmHoldHandler handler,
      CancellationToken ct)
  {
    var response = await handler.Handle(holdId, studentIdContext.StudentId!, ct);
    return Results.Ok(response);
  }
}
