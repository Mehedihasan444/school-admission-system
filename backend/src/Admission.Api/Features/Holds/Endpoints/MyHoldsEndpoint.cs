using Admission.Common.Http;
using Admission.Features.Holds.Application;
using Admission.Features.Holds.Contracts;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;

namespace Admission.Features.Holds.Endpoints;

/// <summary>
/// <c>GET /me/holds</c> (PRD 5.8). Requires <c>X-Student-Id</c>.
/// </summary>
public static class MyHoldsEndpoint
{
  public static void Map(IEndpointRouteBuilder app)
  {
    app.MapGet("/me/holds", Handle)
        .AddEndpointFilter<StudentIdFilter>();
  }

  private static async Task<IResult> Handle(
      StudentIdContext studentIdContext,
      HoldQueryService query,
      CancellationToken ct)
  {
    var response = await query.GetMyHoldsAsync(studentIdContext.StudentId!, ct);
    return Results.Ok(response);
  }
}
