using System.Net;
using Admission.Tests.Infrastructure;
using Xunit;

namespace Admission.Tests.Features.Classes;

/// <summary>
/// Bonus: two independent API hosts sharing one PostgreSQL database must still
/// enforce <c>held + confirmed &lt;= totalSeats</c>.
/// </summary>
[Collection("Postgres")]
public class TwoHostConcurrencyTests : PostgresTestBase
{
  public TwoHostConcurrencyTests(PostgresFixture fixture) : base(fixture)
  {
  }

  [Fact]
  public async Task TwoHostsOnOneDatabaseNeverOversell()
  {
    using var hostA = new ApiFactory(Fixture);
    using var hostB = new ApiFactory(Fixture);

    var admin = new TestClient(hostA.CreateClient());
    var classId = (await admin.CreateClassAsync("Two Host Class", 50)).Id;

    var tasks = Enumerable.Range(1, 200).Select(async i =>
    {
      var host = i % 2 == 0 ? hostA : hostB;
      using var client = host.CreateClient();
      client.WithStudentId(i.ToString("D17", System.Globalization.CultureInfo.InvariantCulture));
      var resp = await new TestClient(client).ApplyRawAsync(classId);
      return resp.StatusCode;
    });

    var results = await Task.WhenAll(tasks);

    Assert.Equal(50, results.Count(status => status == HttpStatusCode.Created));
    Assert.Equal(150, results.Count(status => status == HttpStatusCode.Conflict));

    var finalClass = await admin.GetClassAsync(classId);
    Assert.NotNull(finalClass);
    Assert.Equal(50, finalClass.HeldSeats + finalClass.ConfirmedSeats);
    Assert.Equal(0, finalClass.AvailableSeats);
  }
}
