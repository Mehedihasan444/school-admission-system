using Admission.Common.Errors;
using Admission.Common.Http;
using Admission.Common.Options;
using Admission.Domain;
using Admission.Features.Holds.Contracts;
using Admission.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace Admission.Features.Holds.Application;

/// <summary>
/// Handles <c>POST /classes/{classId}/holds</c>. One PostgreSQL transaction
/// that takes a row-level lock on the class to enforce seat limits across processes.
/// </summary>
public sealed class ApplyHoldHandler
{
  private readonly TimeProvider _clock;
  private readonly AdmissionOptions _options;
  private readonly AdmissionDbContext _db;

  public ApplyHoldHandler(TimeProvider clock, AdmissionDbContext db, AdmissionOptions options)
  {
    _clock = clock;
    _options = options;
    _db = db;
  }

  public async Task<ApplyHoldResponse> Handle(string classId, string studentId, CancellationToken ct)
  {
    if (!RouteParsing.TryParseId(classId, out var classGuid))
      throw AppException.ClassNotFound();

    await using var tx = await _db.Database.BeginTransactionAsync(ct);
    try
    {
      // Take a row-level lock on the class so concurrent applies for the same class
      // serialize here. The lock is what makes the seat count below authoritative;
      // it lives in PostgreSQL, so it also works across multiple API processes.
      // ToListAsync keeps EF from wrapping the statement in an outer SELECT, which
      // would hide the FOR UPDATE from a reader of the SQL log.
      var lockedRows = await _db.Database
          .SqlQuery<int>((FormattableString)$"SELECT total_seats AS \"Value\" FROM classes WHERE id = {classGuid} FOR UPDATE")
          .ToListAsync(ct);

      if (lockedRows.Count == 0)
        throw AppException.ClassNotFound();

      var totalSeats = lockedRows[0];

      // Read the clock only after the lock is acquired: we may have waited here,
      // and an earlier timestamp could revive a hold that expired while waiting.
      var now = _clock.GetUtcNow();
      var expiresAt = now.AddSeconds(_options.HoldDurationSeconds);

      // Expire stale HELD rows of this class so their seats and unique-index
      // slots are free even when the background sweeper has not run.
      await _db.Database.ExecuteSqlInterpolatedAsync(
          (FormattableString)$"UPDATE holds SET status = 'EXPIRED' WHERE class_id = {classGuid} AND status = 'HELD' AND expires_at <= {now}",
          ct);

      // A student may have at most one active (HELD or CONFIRMED) hold per class.
      if (await _db.Holds.AnyAsync(h => h.ClassId == classGuid && h.StudentId == studentId &&
          (h.Status == HoldStatus.Held || h.Status == HoldStatus.Confirmed), ct))
        throw AppException.AlreadyApplied();

      var usedSeats = await _db.Holds
          .CountAsync(h => h.ClassId == classGuid &&
              (h.Status == HoldStatus.Held || h.Status == HoldStatus.Confirmed), ct);

      if (usedSeats >= totalSeats)
        throw AppException.ClassFull();

      var entity = new Hold
      {
        Id = Guid.CreateVersion7(),
        ClassId = classGuid,
        StudentId = studentId,
        Status = HoldStatus.Held,
        CreatedAt = now,
        ExpiresAt = expiresAt
      };

      try
      {
        _db.Holds.Add(entity);
        await _db.SaveChangesAsync(ct);
      }
      catch (DbUpdateException ex) when (ex.InnerException is PostgresException pg && pg.SqlState == "23505")
      {
        // The partial unique index is the second line of defense for duplicate applies.
        throw AppException.AlreadyApplied();
      }

      await tx.CommitAsync(ct);

      return new ApplyHoldResponse(entity.Id.ToString(), classId, studentId,
          HoldStatus.Held, entity.ExpiresAt);
    }
    catch
    {
      await tx.RollbackAsync(ct);
      throw;
    }
  }
}
