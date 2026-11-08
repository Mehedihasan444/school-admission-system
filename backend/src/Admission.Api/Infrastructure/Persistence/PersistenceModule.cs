using Microsoft.EntityFrameworkCore;

namespace Admission.Infrastructure.Persistence;

public static class PersistenceModule
{
  public static IServiceCollection AddPersistence(
      this IServiceCollection services,
      IConfiguration configuration)
  {
    var connectionString = configuration.GetConnectionString("Default")
        ?? throw new InvalidOperationException("Connection string 'ConnectionStrings__Default' is not configured.");

    services.AddDbContext<AdmissionDbContext>(options =>
    {
      options.UseNpgsql(connectionString, npgsql =>
          {
            npgsql.MigrationsAssembly(typeof(AdmissionDbContext).Assembly.FullName);
            npgsql.CommandTimeout(30);
          });
      options.UseSnakeCaseNamingConvention();
    }, ServiceLifetime.Scoped);

    services.AddSingleton<DatabaseInitializer>();

    return services;
  }
}
