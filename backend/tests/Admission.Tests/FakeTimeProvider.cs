using System;
using System.Threading;

namespace Admission.Tests;

/// <summary>
/// Injectable clock that tests can control to simulate time passing.
/// </summary>
public sealed class FakeTimeProvider : TimeProvider
{
  private DateTimeOffset _now;

  public FakeTimeProvider(DateTimeOffset? now = null) => _now = now ?? DateTimeOffset.UtcNow;

  public override DateTimeOffset GetUtcNow() => _now;

  public void Advance(TimeSpan delta) => _now = _now.Add(delta);

  public void Set(DateTimeOffset now) => _now = now;
}
