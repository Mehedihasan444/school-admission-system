using Admission.Common.Errors;
using Admission.Features.Classes.Contracts;

namespace Admission.Features.Classes.Validation;

/// <summary>
/// Validates the <c>CreateClassRequest</c> according to the API contract:

/// - Name: trimmed, non-empty, max 200 characters.
/// - TotalSeats: integer between 1 and 100000.

/// Throws <c>AppException</c> with <c>VALIDATION_ERROR</c> code on first invalid field.
/// </summary>
public sealed class CreateClassRequestValidator
{
  public void Validate(CreateClassRequest request)
  {
    var name = request.Name.Trim();

    if (string.IsNullOrEmpty(name))
      throw AppException.ValidationError("name", "name is required");

    if (name.Length > 200)
      throw AppException.ValidationError("name", "name must be at most 200 characters");

    if (request.TotalSeats < 1 || request.TotalSeats > 100000)
      throw AppException.ValidationError("totalSeats", "totalSeats must be between 1 and 100000");
  }
}
