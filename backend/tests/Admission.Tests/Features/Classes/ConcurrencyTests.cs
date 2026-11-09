using System.Net;
using System.Text.Json;
using Admission.Features.Classes.Contracts;
using Admission.Tests.Infrastructure;
using Xunit;

namespace Admission.Tests.Features.Classes;

[Collection("Postgres")]
public class ConcurrencyTests : PostgresTestBase
{

  public ConcurrencyTests(PostgresFixture fixture) : base(fixture)
  {
  }


  [Fact]
  public async Task ConcurrentAppliesOn50SeatClassResultInExactly50Holds()
  {
    // Arrange
    var client = Factory.CreateClient();
    client.WithStudentId("10000000000000000");
    var testClient = new TestClient(client);

    var classResp = await testClient.CreateClassAsync("Concurrency Class", 50);
    var classId = classResp.Id;

    // Act - fire 200 parallel applies from distinct student IDs
    var tasks = Enumerable.Range(1, 200)
        .Select(async i =>
        {
          var sid = i.ToString("D17", System.Globalization.CultureInfo.InvariantCulture);
          using var scopedClient = Factory.CreateClient();
          scopedClient.WithStudentId(sid);
          var scopedTestClient = new TestClient(scopedClient);
          var resp = await scopedTestClient.ApplyRawAsync(classId);
          return (status: resp.StatusCode, studentId: sid);
        });

    var results = await Task.WhenAll(tasks);

    // Assert
    var created = results.Count(r => r.status == HttpStatusCode.Created);
    var conflicts = results.Count(r => r.status == HttpStatusCode.Conflict);
    Assert.Equal(50, created);
    Assert.Equal(150, conflicts);

    // Seat counts derived from holds table
    var classes = await testClient.ListClassesAsync();
    var theClass = Assert.Single(classes, c => c.Id == classId);
    Assert.Equal(50, theClass.HeldSeats);
    Assert.Equal(0, theClass.ConfirmedSeats);
    Assert.Equal(0, theClass.AvailableSeats);
  }
}
