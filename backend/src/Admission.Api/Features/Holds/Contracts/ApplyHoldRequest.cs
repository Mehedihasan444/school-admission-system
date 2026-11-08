using Admission.Domain;

namespace Admission.Features.Holds.Contracts;

/// <summary>
/// Request body for <c>POST /classes/{classId}/holds</c> (PRD 5.4). No body.
/// </summary>
public sealed record ApplyHoldRequest();

/// <summary>
/// Response for <c>POST /classes/{classId}/holds</c> (PRD 5.4).
/// </summary>
public sealed record ApplyHoldResponse(
    string HoldId,
    string ClassId,
    string StudentId,
    HoldStatus Status,
    DateTimeOffset ExpiresAt);
