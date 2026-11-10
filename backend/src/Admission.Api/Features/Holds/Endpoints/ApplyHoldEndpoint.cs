using Admission.Common.Http;
using Admission.Features.Holds.Application;
using Admission.Features.Holds.Contracts;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;

namespace Admission.Features.Holds.Endpoints;

/// <summary>
/// <c>POST /classes/{classId}/holds</c>. Requires <c>X-Student-Id</c>.
/// </summary>
public static class ApplyHoldEndpoint
{
  public static void Map(IEndpointRouteBuilder app)
  {
    app.MapPost("/classes/{classId}/holds", Handle)
        .AddEndpointFilter<StudentIdFilter>();
  }

  private static async Task<IResult> Handle(
      string classId,
      StudentIdContext studentIdContext,
      ApplyHoldHandler handler,
      CancellationToken ct)
  {
    var response = await handler.Handle(classId, studentIdContext.StudentId!, ct);
    return Results.Created($"/holds/{response.HoldId}", response);
  }
}
