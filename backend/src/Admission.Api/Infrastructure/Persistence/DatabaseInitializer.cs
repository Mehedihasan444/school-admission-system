using Microsoft.AspNetCore.Builder;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace Admission.Infrastructure.Persistence;

public class DatabaseInitializer
{
  private const int MaxRetries = 30;
  private static readonly TimeSpan RetryDelay = TimeSpan.FromSeconds(1);
  private const int MigrateAdvisoryLockId = 727274;

  private static readonly Action<ILogger, Exception?> logDatabaseNotReady =
      LoggerMessage.Define(
          LogLevel.Warning,
          new EventId(1, "DatabaseNotReady"),
          "Database not ready, retrying");

  private static readonly Action<ILogger, Exception?> logMigrationsApplied =
      LoggerMessage.Define(
          LogLevel.Information,
          new EventId(2, "MigrationsApplied"),
          "Database migrations applied");

  public async Task InitializeAsync(
      AdmissionDbContext db,
      ILogger<DatabaseInitializer> logger,
      CancellationToken ct)
  {
    var lastException = default(Exception?);
    for (var attempt = 1; attempt <= MaxRetries; attempt++)
    {
      try
      {
        await OpenAndCloseAsync(db, ct);
        lastException = null;
        break;
      }
      catch (Exception e)
      {
        lastException = e;
        logDatabaseNotReady(logger, e);
        if (attempt < MaxRetries)
        {
          await Task.Delay(RetryDelay, ct);
        }
      }
    }

    if (lastException is not null)
    {
      throw new InvalidOperationException("Could not connect to the database after retries.", lastException);
    }

    var connection = db.Database.GetDbConnection();
    await connection.OpenAsync(ct);
    try
    {
      using var lockCommand = connection.CreateCommand();
      lockCommand.CommandText = $"SELECT pg_advisory_lock({MigrateAdvisoryLockId})";
      await lockCommand.ExecuteNonQueryAsync(ct);

      try
      {
        await db.Database.MigrateAsync(ct);
        logMigrationsApplied(logger, null);
      }
      finally
      {
        using var unlockCommand = connection.CreateCommand();
        unlockCommand.CommandText = $"SELECT pg_advisory_unlock({MigrateAdvisoryLockId})";
        await unlockCommand.ExecuteNonQueryAsync(ct);
      }
    }
    finally
    {
      await connection.CloseAsync();
    }

    static async Task OpenAndCloseAsync(AdmissionDbContext db, CancellationToken ct)
    {
      var probe = db.Database.GetDbConnection();
      await probe.OpenAsync(ct);
      await probe.CloseAsync();
    }
  }
}

public static class WebApplicationExtensions
{
  public static async Task InitializeDatabaseAsync(
      this WebApplication app,
      ILogger<DatabaseInitializer> logger,
      CancellationToken ct)
  {
    using var scope = app.Services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<AdmissionDbContext>();
    var initializer = scope.ServiceProvider.GetRequiredService<DatabaseInitializer>();
    await initializer.InitializeAsync(db, logger, ct);
  }
}
