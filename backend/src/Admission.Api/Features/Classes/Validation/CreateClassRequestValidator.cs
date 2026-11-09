using Admission.Common.Errors;
using Admission.Features.Classes.Contracts;

namespace Admission.Features.Classes.Validation;

/// <summary>
/// Validates the <c>CreateClassRequest</c> according to the API contract:
/// name trimmed to 1..200 characters, totalSeats an integer from 1 to 100000.
/// Returns the normalised class name so callers cannot accidentally use the
/// untrimmed input.
/// </summary>
public sealed class CreateClassRequestValidator
{
  private const int MaxNameLength = 200;
  private const int MinTotalSeats = 1;
  private const int MaxTotalSeats = 100_000;

  public string Validate(CreateClassRequest request)
  {
    var name = request.Name?.Trim() ?? string.Empty;

    if (name.Length == 0)
      throw AppException.ValidationError("name", "name is required");

    if (name.Length > MaxNameLength)
      throw AppException.ValidationError("name", $"name must be at most {MaxNameLength} characters");

    if (request.TotalSeats < MinTotalSeats || request.TotalSeats > MaxTotalSeats)
      throw AppException.ValidationError(
          "totalSeats",
          $"totalSeats must be between {MinTotalSeats} and {MaxTotalSeats}");

    return name;
  }
}
