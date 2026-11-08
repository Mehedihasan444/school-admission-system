using Admission.Domain;
using Admission.Features.Classes.Contracts;
using Admission.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Admission.Features.Classes.Application;

/// <summary>
/// Read-side queries for classes. Seat counts are derived from the
/// <c>holds</c> table at read time using the injected clock, so an unexpired
/// <c>HELD</c> hold whose <c>expiresAt</c> has already passed is never counted.
/// </summary>
public sealed class ClassQueryService
{
  private readonly AdmissionDbContext _db;
  private readonly TimeProvider _clock;

  public ClassQueryService(AdmissionDbContext db, TimeProvider clock)
  {
    _db = db;
    _clock = clock;
  }

  public async Task<IReadOnlyList<ClassResponse>> ListAsync(CancellationToken ct)
  {
    var now = _clock.GetUtcNow();
    var rows = await _db.Classes
        .AsNoTracking()
        .OrderBy(c => c.CreatedAt)
        .Select(c => new
        {
          c.Id,
          c.Name,
          c.TotalSeats,
          Held = _db.Holds.Count(h => h.ClassId == c.Id && h.Status == HoldStatus.Held && h.ExpiresAt > now),
          Confirmed = _db.Holds.Count(h => h.ClassId == c.Id && h.Status == HoldStatus.Confirmed)
        })
        .Select(p => new ClassResponse(
            p.Id.ToString(),
            p.Name,
            p.TotalSeats,
            p.Held,
            p.Confirmed,
            p.TotalSeats - p.Held - p.Confirmed))
        .ToListAsync(ct);

    return rows;
  }

  public async Task<ClassResponse?> GetAsync(Guid classId, CancellationToken ct)
  {
    var now = _clock.GetUtcNow();
    var row = await _db.Classes
        .AsNoTracking()
        .Where(c => c.Id == classId)
        .Select(c => new
        {
          c.Id,
          c.Name,
          c.TotalSeats,
          Held = _db.Holds.Count(h => h.ClassId == c.Id && h.Status == HoldStatus.Held && h.ExpiresAt > now),
          Confirmed = _db.Holds.Count(h => h.ClassId == c.Id && h.Status == HoldStatus.Confirmed)
        })
        .FirstOrDefaultAsync(ct);

    if (row is null)
      return null;

    return new ClassResponse(
        row.Id.ToString(),
        row.Name,
        row.TotalSeats,
        row.Held,
        row.Confirmed,
        row.TotalSeats - row.Held - row.Confirmed);
  }
}
