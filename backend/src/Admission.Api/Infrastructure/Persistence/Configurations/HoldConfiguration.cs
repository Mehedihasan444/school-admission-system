using Admission.Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Admission.Infrastructure.Persistence.Configurations;

public sealed class HoldConfiguration : IEntityTypeConfiguration<Hold>
{
  public void Configure(EntityTypeBuilder<Hold> builder)
  {
    builder.ToTable("holds");
    builder.HasKey(x => x.Id);
    builder.Property(x => x.ClassId).IsRequired();
    builder.Property(x => x.StudentId).IsRequired().HasColumnType("char(17)");
    builder.Property(x => x.Status)
        .IsRequired()
        .HasConversion(
            v => v.ToString().ToUpperInvariant(),
            v => Enum.Parse<HoldStatus>(v, true));
    builder.Property(x => x.CreatedAt).IsRequired();
    builder.Property(x => x.ExpiresAt).IsRequired();
    builder.Property(x => x.ConfirmedAt);
    builder.Property(x => x.CancelledAt);
    builder.HasOne<ClassEntity>().WithMany().HasForeignKey(x => x.ClassId);

    builder.HasIndex(x => new { x.ClassId, x.StudentId })
        .IsUnique()
        .HasFilter("status IN ('HELD','CONFIRMED')")
        .HasDatabaseName("uq_holds_active_student_class");

    builder.HasIndex(x => new { x.ClassId, x.Status, x.ExpiresAt })
        .HasDatabaseName("ix_holds_class_status");

    builder.HasIndex(x => x.StudentId).HasDatabaseName("ix_holds_student");
  }
}
