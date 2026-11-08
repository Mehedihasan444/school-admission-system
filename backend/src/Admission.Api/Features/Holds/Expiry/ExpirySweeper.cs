using Admission.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Admission.Features.Holds.Expiry;

/// <summary>
/// Bulk-expires stale <c>HELD</c> holds whose <c>expires_at</c> has passed.
/// Idempotent and safe to run in multiple backend processes.
/// Correctness never depends on this sweeper — every read/apply/confirm/cancel
/// path treats overdue HELD rows as expired regardless of whether the sweeper ran.
/// </summary>
public sealed class ExpirySweeper
{
  private readonly TimeProvider _clock;
  private readonly AdmissionDbContext _db;

  public ExpirySweeper(TimeProvider clock, AdmissionDbContext db)
  {
    _clock = clock;
    _db = db;
  }

  public async Task<int> SweepAsync(CancellationToken ct)
  {
    var now = _clock.GetUtcNow();

    return await _db.Database.ExecuteSqlInterpolatedAsync(
        (FormattableString)$"UPDATE holds SET status = 'EXPIRED' WHERE status = 'HELD' AND expires_at <= {now}",
        ct);
  }
}
