namespace Admission.Domain;

public sealed class ClassEntity
{
  public Guid Id { get; set; }
  public string Name { get; set; } = "";
  public int TotalSeats { get; set; }
  public DateTimeOffset CreatedAt { get; set; }
}
