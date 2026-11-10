using Admission.Common.Errors;
using Admission.Common.Http;
using Admission.Domain;
using Admission.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Admission.Features.Holds.Application;

/// <summary>
/// Handles <c>DELETE /holds/{holdId}</c>. Single atomic conditional UPDATE.
/// </summary>
public sealed class CancelHoldHandler
{
  private readonly TimeProvider _clock;
  private readonly AdmissionDbContext _db;

  public CancelHoldHandler(TimeProvider clock, AdmissionDbContext db)
  {
    _clock = clock;
    _db = db;
  }

  public async Task Handle(string holdId, string studentId, CancellationToken ct)
  {
    var now = _clock.GetUtcNow();

    if (!RouteParsing.TryParseId(holdId, out var holdGuid))
      throw AppException.HoldNotFound();

    var rows = await _db.Database.ExecuteSqlInterpolatedAsync(
        (FormattableString)$"UPDATE holds SET status = 'CANCELLED', cancelled_at = {now} WHERE id = {holdGuid} AND student_id = {studentId} AND status = 'HELD' AND expires_at > {now}",
        ct);

    if (rows == 1)
      return; // 204

    // 0 rows - load to determine error
    var hold = await _db.Holds.FirstOrDefaultAsync(h => h.Id == holdGuid, ct);
    if (hold is null)
      throw AppException.HoldNotFound();

    if (hold.StudentId != studentId)
      throw AppException.HoldNotFound();

    var effective = HoldRules.EffectiveStatus(hold, now);
    switch (effective)
    {
      case HoldStatus.Confirmed:
        throw AppException.HoldAlreadyConfirmed();
      case HoldStatus.Cancelled:
        throw AppException.HoldCancelled();
      case HoldStatus.Expired:
        throw AppException.HoldExpired();
      default:
        throw AppException.HoldExpired();
    }
  }
}
