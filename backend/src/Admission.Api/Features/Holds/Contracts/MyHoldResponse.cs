using Admission.Domain;

namespace Admission.Features.Holds.Contracts;

/// <summary>
/// Response item for <c>GET /me/holds</c> (PRD 5.8).
/// </summary>
public sealed record MyHoldResponse(
    string HoldId,
    string ClassId,
    string ClassName,
    HoldStatus Status,
    DateTimeOffset ExpiresAt);
