using Admission.Domain;

namespace Admission.Features.Holds.Contracts;

/// <summary>
/// Response for <c>POST /holds/{holdId}/confirm</c> (PRD 5.6).
/// </summary>
public sealed record ConfirmHoldResponse(string HoldId, HoldStatus Status);
