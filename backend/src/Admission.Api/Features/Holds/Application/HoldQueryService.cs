using Admission.Common.Http;
using Admission.Domain;
using Admission.Features.Holds.Contracts;
using Admission.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Admission.Features.Holds.Application;

/// <summary>
/// Read-side queries for holds. All reads use effective status.
/// </summary>
public sealed class HoldQueryService
{
  private readonly TimeProvider _clock;
  private readonly AdmissionDbContext _db;

  public HoldQueryService(TimeProvider clock, AdmissionDbContext db)
  {
    _clock = clock;
    _db = db;
  }

  public async Task<HoldResponse?> GetAsync(string holdId, CancellationToken ct)
  {
    var now = _clock.GetUtcNow();

    if (!RouteParsing.TryParseId(holdId, out var holdGuid))
      return null;

    var row = await _db.Holds
        .AsNoTracking()
        .Where(h => h.Id == holdGuid)
        .Select(h => new
        {
          h.Id,
          h.ClassId,
          h.Status,
          h.ExpiresAt
        })
        .FirstOrDefaultAsync(ct);

    if (row is null)
      return null;

    return new HoldResponse(row.Id.ToString(), row.ClassId.ToString(),
        HoldRules.EffectiveStatus(row.Status, row.ExpiresAt, now), row.ExpiresAt);
  }

  public async Task<IReadOnlyList<MyHoldResponse>> GetMyHoldsAsync(string studentId, CancellationToken ct)
  {
    var now = _clock.GetUtcNow();

    var rows = await _db.Holds
        .AsNoTracking()
        .Where(h => h.StudentId == studentId)
        .Join(_db.Classes, h => h.ClassId, c => c.Id, (h, c) => new
        {
          HoldId = h.Id,
          ClassId = c.Id,
          ClassName = c.Name,
          h.Status,
          h.CreatedAt,
          h.ExpiresAt
        })
        .OrderByDescending(r => r.CreatedAt)
        .ToListAsync(ct);

    return rows.Select(r => new MyHoldResponse(
        r.HoldId.ToString(),
        r.ClassId.ToString(),
        r.ClassName,
        HoldRules.EffectiveStatus(r.Status, r.ExpiresAt, now),
        r.ExpiresAt)).ToList();
  }
}
