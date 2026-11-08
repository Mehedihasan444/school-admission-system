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
/// Handles <c>POST /classes/{classId}/holds</c> (PRD 5.4). One PostgreSQL transaction
/// that takes a row-level lock on the class to enforce seat limits.
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
    var now = _clock.GetUtcNow();
    var durationSeconds = _options.HoldDurationSeconds;
    var expiresAt = now.AddSeconds(durationSeconds);

    if (!RouteParsing.TryParseId(classId, out var classGuid))
      throw AppException.ClassNotFound();

    await using var tx = await _db.Database.BeginTransactionAsync(ct);
    try
    {
      // Lock the class row so concurrent applies for the same class serialize here.
      // Raw SQL ensures PostgreSQL doesn't wrap the SELECT in an implicit transaction.
      var totalSeats = await _db.Database
          .SqlQuery<int>((FormattableString)$"SELECT total_seats FROM classes WHERE id = {classGuid}")
          .FirstOrDefaultAsync(ct);

      if (totalSeats <= 0)
        throw AppException.ClassNotFound();

      // Expire stale HELD rows of this class so their unique-index slot frees up.
      await _db.Database.ExecuteSqlInterpolatedAsync(
          (FormattableString)$"UPDATE holds SET status = 'EXPIRED' WHERE class_id = {classGuid} AND status = 'HELD' AND expires_at <= {expiresAt}",
          ct);

      // Students may have at most one active (HELD or CONFIRMED) hold per class.
      if (await _db.Holds.AnyAsync(h => h.ClassId == classGuid && h.StudentId == studentId &&
          (h.Status == HoldStatus.Held || h.Status == HoldStatus.Confirmed), ct))
        throw AppException.AlreadyApplied();

      var existingCount = await _db.Holds
          .CountAsync(h => h.ClassId == classGuid &&
              (h.Status == HoldStatus.Held || h.Status == HoldStatus.Confirmed), ct);

      if (existingCount >= totalSeats)
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

      // Handle the unique constraint violation as a second safety net for ALREADY_APPLIED.
      try
      {
        _db.Holds.Add(entity);
        await _db.SaveChangesAsync(ct);
      }
      catch (DbUpdateException ex) when (ex.InnerException is PostgresException pg && pg.SqlState == "23505")
      {
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
