using Admission.Domain;

namespace Admission.Features.Holds.Contracts;

/// <summary>
/// Response item for <c>GET /me/holds</c>.
/// </summary>
public sealed record MyHoldResponse(
    string HoldId,
    string ClassId,
    string ClassName,
    HoldStatus Status,
    DateTimeOffset ExpiresAt);
