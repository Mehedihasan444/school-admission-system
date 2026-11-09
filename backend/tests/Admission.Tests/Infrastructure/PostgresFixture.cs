using System;
using System.Threading.Tasks;
using Admission.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Testcontainers.PostgreSql;
using Xunit;

namespace Admission.Tests.Infrastructure;

/// <summary>
/// Provides one real PostgreSQL database for the whole test run.
/// By default a Testcontainers container is started. When
/// <c>TEST_DATABASE_CONNECTION</c> is set, that existing PostgreSQL instance is
/// used instead, which lets the suite run on machines where the Docker socket is
/// not available. Either way the tests exercise real PostgreSQL locking.
/// </summary>
public class PostgresFixture : IAsyncLifetime
{
  private PostgreSqlContainer? _container;

  public string ConnectionString { get; private set; } = string.Empty;

  public async Task InitializeAsync()
  {
    var externalConnection = Environment.GetEnvironmentVariable("TEST_DATABASE_CONNECTION");
    if (!string.IsNullOrWhiteSpace(externalConnection))
    {
      ConnectionString = externalConnection;
      return;
    }

    _container = new PostgreSqlBuilder("postgres:16-alpine")
        .WithDatabase("admission_test")
        .WithUsername("admission")
        .WithPassword("admission")
        .Build();

    await _container.StartAsync();
    ConnectionString = _container.GetConnectionString();
  }

  public async Task DisposeAsync()
  {
    if (_container is not null)
    {
      await _container.DisposeAsync();
    }
  }

  public AdmissionDbContext CreateDbContext()
  {
    var options = new DbContextOptionsBuilder<AdmissionDbContext>()
        .UseNpgsql(ConnectionString, npgsql => npgsql.MigrationsAssembly(typeof(AdmissionDbContext).Assembly.FullName!))
        .ConfigureWarnings(w => w.Ignore(RelationalEventId.PendingModelChangesWarning))
        .UseSnakeCaseNamingConvention()
        .Options;
    return new AdmissionDbContext(options);
  }

  /// <summary>
  /// Applies migrations once against the test database.
  /// </summary>
  public async Task EnsureMigratedAsync()
  {
    await using var context = CreateDbContext();
    await context.Database.MigrateAsync();
  }
}

[CollectionDefinition("Postgres")]
public class PostgresDatabaseFixture : ICollectionFixture<PostgresFixture>;

/// <summary>
/// Base for integration tests. Each test cleans up its own rows and every test
/// creates a fresh class, so tests stay independent without truncating between
/// every assertion.
/// </summary>
public abstract class PostgresTestBase : IAsyncLifetime
{
  protected PostgresFixture Fixture { get; }

  protected ApiFactory Factory { get; }

  protected PostgresTestBase(PostgresFixture fixture)
  {
    Fixture = fixture;
    Factory = new ApiFactory(fixture);
  }

  public async Task InitializeAsync() => await Fixture.EnsureMigratedAsync();

  public async Task DisposeAsync()
  {
    await Factory.DisposeAsync();

    await using var context = Fixture.CreateDbContext();
    await context.Database.ExecuteSqlRawAsync("DELETE FROM holds;");
    await context.Database.ExecuteSqlRawAsync("DELETE FROM classes;");
  }
}
