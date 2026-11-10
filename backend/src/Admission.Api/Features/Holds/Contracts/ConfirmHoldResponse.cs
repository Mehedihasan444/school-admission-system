using Admission.Domain;

namespace Admission.Features.Holds.Contracts;

/// <summary>
/// Response for <c>POST /holds/{holdId}/confirm</c>.
/// </summary>
public sealed record ConfirmHoldResponse(string HoldId, HoldStatus Status);
