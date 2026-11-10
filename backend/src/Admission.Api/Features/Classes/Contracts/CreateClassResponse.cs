namespace Admission.Features.Classes.Contracts;

/// <summary>
/// Response for <c>POST /classes</c>. Only the fields required by the API:
/// <c>id</c>, <c>name</c> and <c>totalSeats</c>. Derived seat counts are not needed for creation.
/// </summary>
public sealed record CreateClassResponse(string Id, string Name, int TotalSeats);
