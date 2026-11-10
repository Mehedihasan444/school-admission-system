namespace Admission.Features.Classes.Contracts;

/// <summary>
/// Response for <c>GET /classes</c> and <c>GET /classes/{classId}</c>.
/// Seat counts are derived from the <c>holds</c> table at read time (see <c>ClassQueryService</c>).
/// </summary>
public sealed record ClassResponse(
    string Id,
    string Name,
    int TotalSeats,
    int HeldSeats,
    int ConfirmedSeats,
    int AvailableSeats);
