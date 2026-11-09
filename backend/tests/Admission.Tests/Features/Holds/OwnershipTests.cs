using System.Net;
using Admission.Features.Classes.Contracts;
using Admission.Tests.Infrastructure;
using Xunit;

namespace Admission.Tests.Features.Holds;

[Collection("Postgres")]
public class OwnershipTests : PostgresTestBase
{

  public OwnershipTests(PostgresFixture fixture) : base(fixture)
  {
  }


  [Fact]
  public async Task OtherStudentConfirmReturns404()
  {
    var ownerClient = Factory.CreateClient();
    ownerClient.WithStudentId("50000000000000001");
    var ownerTc = new TestClient(ownerClient);

    var classResp = await ownerTc.CreateClassAsync("Ownership Class", 1);
    var classId = classResp.Id;

    var hold = await ownerTc.ApplyAsync(classId);

    // Other student tries to confirm
    var otherClient = Factory.CreateClient();
    otherClient.WithStudentId("50000000000000002");
    var otherTc = new TestClient(otherClient);

    var confirmResp = await otherTc.ConfirmRawAsync(hold.HoldId);
    Assert.Equal(HttpStatusCode.NotFound, confirmResp.StatusCode);
  }

  [Fact]
  public async Task OtherStudentCancelReturns404()
  {
    var ownerClient = Factory.CreateClient();
    ownerClient.WithStudentId("50000000000000003");
    var ownerTc = new TestClient(ownerClient);

    var classResp = await ownerTc.CreateClassAsync("Ownership Cancel Class", 1);
    var classId = classResp.Id;

    var hold = await ownerTc.ApplyAsync(classId);

    // Other student tries to cancel
    var otherClient = Factory.CreateClient();
    otherClient.WithStudentId("50000000000000004");
    var otherTc = new TestClient(otherClient);

    var cancelResp = await otherTc.CancelRawAsync(hold.HoldId);
    Assert.Equal(HttpStatusCode.NotFound, cancelResp.StatusCode);
  }

  [Fact]
  public async Task CancelAfterConfirmReturns409AlreadyConfirmed()
  {
    var client = Factory.CreateClient();
    client.WithStudentId("50000000000000005");
    var tc = new TestClient(client);

    var classResp = await tc.CreateClassAsync("Cancel After Confirm Class", 1);
    var classId = classResp.Id;

    var hold = await tc.ApplyAsync(classId);

    // Confirm first
    var confirmResp = await tc.ConfirmRawAsync(hold.HoldId);
    Assert.Equal(System.Net.HttpStatusCode.OK, confirmResp.StatusCode);

    // Then cancel - should fail with 409 HOLD_ALREADY_CONFIRMED
    var cancelResp = await tc.CancelRawAsync(hold.HoldId);
    Assert.Equal(HttpStatusCode.Conflict, cancelResp.StatusCode);
  }
}
