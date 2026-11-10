using Admission.Domain;

namespace Admission.Features.Holds.Contracts;

/// <summary>
/// Response for <c>GET /holds/{holdId}</c>.
/// </summary>
public sealed record HoldResponse(
    string HoldId,
    string ClassId,
    HoldStatus Status,
    DateTimeOffset ExpiresAt);
