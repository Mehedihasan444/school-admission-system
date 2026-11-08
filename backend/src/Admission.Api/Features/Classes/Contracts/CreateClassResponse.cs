namespace Admission.Features.Classes.Contracts;

/// <summary>
/// Response for <c>POST /classes</c> (PRD 5.1). Only the fields required by the
/// contract: <c>id</c>, <c>name</c> and <c>totalSeats</c>. Derived seat counts are not needed for creation.
/// </summary>
public sealed record CreateClassResponse(string Id, string Name, int TotalSeats);
