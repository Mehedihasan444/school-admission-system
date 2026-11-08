using System.ComponentModel.DataAnnotations;

namespace Admission.Common.Options;

public sealed class AdmissionOptions
{
  public const string SectionName = "Admission";

  [Range(1, int.MaxValue)]
  public int HoldDurationSeconds { get; set; } = 600;

  [Range(1, int.MaxValue)]
  public int ExpirySweepSeconds { get; set; } = 5;

  public bool ExpiryWorkerEnabled { get; set; } = true;

  public string[] CorsAllowedOrigins { get; set; } = ["http://localhost:3000"];
}
