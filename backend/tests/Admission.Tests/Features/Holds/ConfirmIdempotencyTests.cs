using System.Net;
using Admission.Features.Classes.Contracts;
using Admission.Tests.Infrastructure;
using Xunit;

namespace Admission.Tests.Features.Holds;

[Collection("Postgres")]
public class ConfirmIdempotencyTests : PostgresTestBase
{

  public ConfirmIdempotencyTests(PostgresFixture fixture) : base(fixture)
  {
  }


  [Fact]
  public async Task ConfirmingTwiceDoesNotDoubleCountConfirmedSeats()
  {
    var client = Factory.CreateClient();
    client.WithStudentId("40000000000000001");
    var tc = new TestClient(client);

    var classResp = await tc.CreateClassAsync("Idempotency Class", 1);
    var classId = classResp.Id;

    var hold = await tc.ApplyAsync(classId);

    // Confirm first time
    var confirm1 = await tc.ConfirmRawAsync(hold.HoldId);
    Assert.Equal(System.Net.HttpStatusCode.OK, confirm1.StatusCode);

    // Confirm second time - should still succeed (idempotent)
    var confirm2 = await tc.ConfirmRawAsync(hold.HoldId);
    Assert.Equal(System.Net.HttpStatusCode.OK, confirm2.StatusCode);

    // Class counts should still show 1 confirmed, not 2
    var classes = await tc.ListClassesAsync();
    var theClass = Assert.Single(classes, c => c.Id == classId);
    Assert.Equal(0, theClass.HeldSeats);
    Assert.Equal(1, theClass.ConfirmedSeats);
    Assert.Equal(0, theClass.AvailableSeats);
  }
}
