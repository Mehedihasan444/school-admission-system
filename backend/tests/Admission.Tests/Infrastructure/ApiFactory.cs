using System;
using System.Linq;
using Admission.Common.Options;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

namespace Admission.Tests.Infrastructure;

/// <summary>
/// Hosts the real <c>Program</c> against the test PostgreSQL database.
/// Uses a one-second hold duration, disables the expiry background worker and
/// replaces the clock with <see cref="FakeTimeProvider"/> so tests control time.
/// </summary>
public sealed class ApiFactory : WebApplicationFactory<Program>
{
  private readonly PostgresFixture _fixture;

  public ApiFactory(PostgresFixture fixture)
  {
    _fixture = fixture;

    // Program reads configuration while the builder is created, so these must
    // be in place before the host is built.
    Environment.SetEnvironmentVariable("ConnectionStrings__Default", _fixture.ConnectionString);
    Environment.SetEnvironmentVariable("HOLD_DURATION_SECONDS", "1");
    Environment.SetEnvironmentVariable("Admission__ExpiryWorkerEnabled", "false");
  }

  public FakeTimeProvider GetTimeProvider() =>
      Services.GetRequiredService<FakeTimeProvider>();

  protected override void ConfigureWebHost(IWebHostBuilder builder)
  {
    builder.UseEnvironment("Testing");
    builder.ConfigureServices(services =>
    {
      services.AddSingleton<FakeTimeProvider>();

      var systemClock = services.SingleOrDefault(d => d.ServiceType == typeof(TimeProvider));
      if (systemClock is not null)
      {
        services.Remove(systemClock);
      }

      services.AddSingleton<TimeProvider>(sp => sp.GetRequiredService<FakeTimeProvider>());
      services.PostConfigure<AdmissionOptions>(options => options.ExpiryWorkerEnabled = false);
    });

    base.ConfigureWebHost(builder);
  }
}

/// <summary>
/// Sets the <c>X-Student-Id</c> header for every request from this client.
/// </summary>
public static class HttpClientExtensions
{
  public static HttpClient WithStudentId(this HttpClient client, string studentId)
  {
    client.DefaultRequestHeaders.Remove("X-Student-Id");
    client.DefaultRequestHeaders.Add("X-Student-Id", studentId);
    return client;
  }
}
