using Admission.Domain;
using Xunit;

namespace Admission.Tests.Features.Holds;

public class HoldRulesTests
{
  [Fact]
  public void EffectiveStatusHeldAndNotExpiredReturnsHeld()
  {
    var hold = new Hold { Status = HoldStatus.Held, ExpiresAt = DateTimeOffset.UtcNow.AddHours(1) };
    Assert.Equal(HoldStatus.Held, HoldRules.EffectiveStatus(hold, DateTimeOffset.UtcNow));
  }

  [Fact]
  public void EffectiveStatusHeldAndExpiredReturnsExpired()
  {
    var hold = new Hold { Status = HoldStatus.Held, ExpiresAt = DateTimeOffset.UtcNow.AddHours(-1) };
    Assert.Equal(HoldStatus.Expired, HoldRules.EffectiveStatus(hold, DateTimeOffset.UtcNow));
  }

  [Fact]
  public void EffectiveStatusConfirmedAlwaysConfirmed()
  {
    var hold = new Hold { Status = HoldStatus.Confirmed, ExpiresAt = DateTimeOffset.UtcNow.AddHours(-1) };
    Assert.Equal(HoldStatus.Confirmed, HoldRules.EffectiveStatus(hold, DateTimeOffset.UtcNow));
  }

  [Fact]
  public void EffectiveStatusCancelledAlwaysCancelled()
  {
    var hold = new Hold { Status = HoldStatus.Cancelled, ExpiresAt = DateTimeOffset.UtcNow.AddHours(-1) };
    Assert.Equal(HoldStatus.Cancelled, HoldRules.EffectiveStatus(hold, DateTimeOffset.UtcNow));
  }

  [Fact]
  public void EffectiveStatusExpiredAlwaysExpired()
  {
    var hold = new Hold { Status = HoldStatus.Expired, ExpiresAt = DateTimeOffset.UtcNow.AddHours(-1) };
    Assert.Equal(HoldStatus.Expired, HoldRules.EffectiveStatus(hold, DateTimeOffset.UtcNow));
  }

  [Theory]
  [InlineData(HoldStatus.Held)]
  [InlineData(HoldStatus.Confirmed)]
  public void IsActiveHeldAndConfirmedReturnTrue(HoldStatus status)
  {
    Assert.True(HoldRules.IsActive(status));
  }

  [Theory]
  [InlineData(HoldStatus.Expired)]
  [InlineData(HoldStatus.Cancelled)]
  public void IsActiveExpiredAndCancelledReturnFalse(HoldStatus status)
  {
    Assert.False(HoldRules.IsActive(status));
  }

  [Fact]
  public void IsExpiredHeldAndExpiredReturnsTrue()
  {
    var hold = new Hold { Status = HoldStatus.Held, ExpiresAt = DateTimeOffset.UtcNow.AddHours(-1) };
    Assert.True(HoldRules.IsExpired(hold, DateTimeOffset.UtcNow));
  }

  [Fact]
  public void IsExpiredHeldAndNotExpiredReturnsFalse()
  {
    var hold = new Hold { Status = HoldStatus.Held, ExpiresAt = DateTimeOffset.UtcNow.AddHours(1) };
    Assert.False(HoldRules.IsExpired(hold, DateTimeOffset.UtcNow));
  }

  [Fact]
  public void IsExpiredConfirmedReturnsFalse()
  {
    var hold = new Hold { Status = HoldStatus.Confirmed, ExpiresAt = DateTimeOffset.UtcNow.AddHours(-1) };
    Assert.False(HoldRules.IsExpired(hold, DateTimeOffset.UtcNow));
  }

  [Fact]
  public void EffectiveStatusOverloadMatchesHoldOverload()
  {
    var now = DateTimeOffset.UtcNow;
    var hold = new Hold { Status = HoldStatus.Held, ExpiresAt = now.AddMinutes(-30) };

    var fromHold = HoldRules.EffectiveStatus(hold, now);
    var fromParts = HoldRules.EffectiveStatus(hold.Status, hold.ExpiresAt, now);

    Assert.Equal(fromHold, fromParts);
  }
}
