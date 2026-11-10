using Admission.Common.Errors;
using Admission.Common.Http;
using Admission.Domain;
using Admission.Features.Holds.Contracts;
using Admission.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Admission.Features.Holds.Application;

/// <summary>
/// Handles <c>POST /holds/{holdId}/confirm</c>. Single atomic conditional UPDATE.
/// </summary>
public sealed class ConfirmHoldHandler
{
  private readonly TimeProvider _clock;
  private readonly AdmissionDbContext _db;

  public ConfirmHoldHandler(TimeProvider clock, AdmissionDbContext db)
  {
    _clock = clock;
    _db = db;
  }

  public async Task<ConfirmHoldResponse> Handle(string holdId, string studentId, CancellationToken ct)
  {
    var now = _clock.GetUtcNow();

    if (!RouteParsing.TryParseId(holdId, out var holdGuid))
      throw AppException.HoldNotFound();

    var rows = await _db.Database.ExecuteSqlInterpolatedAsync(
        (FormattableString)$"UPDATE holds SET status = 'CONFIRMED', confirmed_at = {now} WHERE id = {holdGuid} AND student_id = {studentId} AND status = 'HELD' AND expires_at > {now}",
        ct);

    if (rows == 1)
      return new ConfirmHoldResponse(holdId, HoldStatus.Confirmed);

    // 0 rows affected - load to determine the exact error.
    var hold = await _db.Holds.FirstOrDefaultAsync(h => h.Id == holdGuid, ct);
    if (hold is null)
      throw AppException.HoldNotFound();

    if (hold.StudentId != studentId)
      throw AppException.HoldNotFound();

    var effective = HoldRules.EffectiveStatus(hold, now);
    return effective switch
    {
      HoldStatus.Confirmed => new ConfirmHoldResponse(holdId, HoldStatus.Confirmed),
      HoldStatus.Cancelled => throw AppException.HoldCancelled(),
      HoldStatus.Expired => throw AppException.HoldExpired(),
      _ => throw AppException.HoldExpired()
    };
  }
}
