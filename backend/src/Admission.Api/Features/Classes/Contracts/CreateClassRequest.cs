namespace Admission.Features.Classes.Contracts;

/// <summary>
/// Request body for <c>POST /classes</c>.
/// Field names match the frozen API contract in PRD 5.1.
/// </summary>
public sealed record CreateClassRequest(string Name, int TotalSeats);
