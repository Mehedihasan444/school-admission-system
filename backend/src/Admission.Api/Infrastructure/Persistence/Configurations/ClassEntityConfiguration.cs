using Admission.Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Admission.Infrastructure.Persistence.Configurations;

public sealed class ClassEntityConfiguration : IEntityTypeConfiguration<ClassEntity>
{
  public void Configure(EntityTypeBuilder<ClassEntity> builder)
  {
    builder.ToTable("classes");
    builder.HasKey(x => x.Id);
    builder.Property(x => x.Name).IsRequired().HasMaxLength(200);
    builder.Property(x => x.TotalSeats).IsRequired();
    builder.ToTable(t => t.HasCheckConstraint("ck_classes_total_seats", "total_seats > 0"));
    builder.Property(x => x.CreatedAt).IsRequired();
  }
}
