using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;
using Microsoft.EntityFrameworkCore.Infrastructure;

namespace Admission.Infrastructure.Persistence;

public sealed class AdmissionDbContextFactory : IDesignTimeDbContextFactory<AdmissionDbContext>
{
  public AdmissionDbContext CreateDbContext(string[] args)
  {
    var connectionString = Environment.GetEnvironmentVariable("ConnectionStrings__Default")
        ?? "Host=localhost;Port=5432;Database=admission;Username=admission;Password=admission;Maximum Pool Size=100;Timeout=30";

    var options = new DbContextOptionsBuilder<AdmissionDbContext>()
        .UseNpgsql(connectionString, npgsql =>
        {
          npgsql.MigrationsAssembly(typeof(AdmissionDbContext).Assembly.FullName);
          npgsql.CommandTimeout(30);
        })
        .UseSnakeCaseNamingConvention()
        .Options;

    return new AdmissionDbContext(options);
  }
}
