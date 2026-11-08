namespace Admission.Domain;

public sealed class Hold
{
  public Guid Id { get; set; }
  public Guid ClassId { get; set; }
  public string StudentId { get; set; } = "";
  public HoldStatus Status { get; set; }
  public DateTimeOffset CreatedAt { get; set; }
  public DateTimeOffset ExpiresAt { get; set; }
  public DateTimeOffset? ConfirmedAt { get; set; }
  public DateTimeOffset? CancelledAt { get; set; }
}
