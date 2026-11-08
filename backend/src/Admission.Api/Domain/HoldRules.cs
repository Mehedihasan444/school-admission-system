namespace Admission.Domain;

public static class HoldRules
{
  public static HoldStatus EffectiveStatus(Hold hold, DateTimeOffset now) =>
      hold.Status == HoldStatus.Held && hold.ExpiresAt <= now ? HoldStatus.Expired : hold.Status;

  public static HoldStatus EffectiveStatus(HoldStatus status, DateTimeOffset expiresAt, DateTimeOffset now) =>
      status == HoldStatus.Held && expiresAt <= now ? HoldStatus.Expired : status;

  public static bool IsActive(HoldStatus status) =>
      status is HoldStatus.Held or HoldStatus.Confirmed;

  public static bool IsExpired(Hold hold, DateTimeOffset now) =>
      hold.Status == HoldStatus.Held && hold.ExpiresAt <= now;
}
