namespace Admission.Features.Classes.Contracts;

/// <summary>
/// Request body for <c>POST /classes</c>. Field names match the public API
/// contract. <c>Name</c> is nullable so a missing field produces a clean
/// <c>400 VALIDATION_ERROR</c> instead of a framework parse failure.
/// </summary>
public sealed record CreateClassRequest(string? Name, int TotalSeats);
