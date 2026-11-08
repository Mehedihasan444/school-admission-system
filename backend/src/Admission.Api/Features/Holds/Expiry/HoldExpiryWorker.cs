using Admission.Common.Options;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Admission.Features.Holds.Expiry;

/// <summary>
/// Background service that periodically sweeps expired HOLD holds.
/// Disabled when <c>Admission:ExpiryWorkerEnabled</c> is false.
/// </summary>
public sealed class HoldExpiryWorker : BackgroundService
{
  private static readonly Action<ILogger, int, Exception?> logSwept =
      LoggerMessage.Define<int>(LogLevel.Information, new EventId(1, "HoldExpirySwept"), "Expired {Swept} stale holds.");

  private static readonly Action<ILogger, Exception?> logDisabled =
      LoggerMessage.Define(LogLevel.Information, new EventId(2, "HoldExpiryDisabled"), "Hold expiry worker is disabled.");

  private static readonly Action<ILogger, Exception?> logSweepFailed =
      LoggerMessage.Define(LogLevel.Error, new EventId(3, "HoldExpirySweepFailed"), "Hold expiry sweep failed.");

  private readonly IServiceProvider _services;
  private readonly IOptions<AdmissionOptions> _options;
  private readonly ILogger<HoldExpiryWorker> _logger;

  public HoldExpiryWorker(IServiceProvider services, IOptions<AdmissionOptions> options, ILogger<HoldExpiryWorker> logger)
  {
    _services = services;
    _options = options;
    _logger = logger;
  }

  protected override async Task ExecuteAsync(CancellationToken stoppingToken)
  {
    if (!_options.Value.ExpiryWorkerEnabled)
    {
      logDisabled(_logger, null);
      return;
    }

    using var timer = new PeriodicTimer(TimeSpan.FromSeconds(_options.Value.ExpirySweepSeconds));

    while (await timer.WaitForNextTickAsync(stoppingToken))
    {
      try
      {
        using var scope = _services.CreateScope();
        var sweeper = scope.ServiceProvider.GetRequiredService<ExpirySweeper>();
        var swept = await sweeper.SweepAsync(stoppingToken);
        if (swept > 0)
          logSwept(_logger, swept, null);
      }
      catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
      {
      }
      catch (Exception ex)
      {
        logSweepFailed(_logger, ex);
      }
    }
  }
}
