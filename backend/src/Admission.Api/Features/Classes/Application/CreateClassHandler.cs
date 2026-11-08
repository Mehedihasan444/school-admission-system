using Admission.Domain;
using Admission.Features.Classes.Contracts;
using Admission.Features.Classes.Validation;
using Admission.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Admission.Features.Classes.Application;

/// <summary>
/// Handles <c>POST /classes</c>. Validates the request, creates the entity,
/// and returns the contract response. No business rules beyond validation live here.
/// </summary>
public sealed class CreateClassHandler
{
  private readonly AdmissionDbContext _db;
  private readonly TimeProvider _clock;
  private readonly CreateClassRequestValidator _validator;

  public CreateClassHandler(
      AdmissionDbContext db,
      TimeProvider clock,
      CreateClassRequestValidator validator)
  {
    _db = db;
    _clock = clock;
    _validator = validator;
  }

  public async Task<CreateClassResponse> Handle(CreateClassRequest request, CancellationToken ct)
  {
    _validator.Validate(request);

    var now = _clock.GetUtcNow();
    var entity = new ClassEntity
    {
      Id = Guid.CreateVersion7(),
      Name = request.Name.Trim(),
      TotalSeats = request.TotalSeats,
      CreatedAt = now
    };

    _db.Classes.Add(entity);
    await _db.SaveChangesAsync(ct);

    return new CreateClassResponse(entity.Id.ToString(), entity.Name, entity.TotalSeats);
  }
}
