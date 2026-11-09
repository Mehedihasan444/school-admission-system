namespace Admission.Features.Classes.Contracts;

/// <summary>
/// Request body for <c>POST /classes</c>. Field names match the frozen API
/// contract in PRD 5.1. <c>Name</c> is nullable so a missing field produces a
/// clean <c>400 VALIDATION_ERROR</c> instead of a framework parse failure.
/// </summary>
public sealed record CreateClassRequest(string? Name, int TotalSeats);
