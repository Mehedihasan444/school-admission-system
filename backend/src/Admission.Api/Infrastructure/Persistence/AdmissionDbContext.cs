using Admission.Domain;
using Microsoft.EntityFrameworkCore;

namespace Admission.Infrastructure.Persistence;

public sealed class AdmissionDbContext : DbContext
{
  public AdmissionDbContext(DbContextOptions<AdmissionDbContext> options) : base(options) { }

  public DbSet<ClassEntity> Classes => Set<ClassEntity>();
  public DbSet<Hold> Holds => Set<Hold>();

  protected override void OnModelCreating(ModelBuilder modelBuilder)
  {
    modelBuilder.ApplyConfigurationsFromAssembly(typeof(AdmissionDbContext).Assembly);
  }
}
