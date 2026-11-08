using Admission.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Admission.Common.Http;

public static class HealthEndpoint
{
  public static async Task<IResult> Handle(
      AdmissionDbContext db,
      CancellationToken ct)
  {
    var reachable = await db.Database.CanConnectAsync(ct);
    return reachable ? Results.Ok() : Results.StatusCode(StatusCodes.Status503ServiceUnavailable);
  }
}
