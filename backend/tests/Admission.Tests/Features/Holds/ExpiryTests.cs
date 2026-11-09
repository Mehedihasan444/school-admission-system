using System.Net;
using System.Net.Http.Json;
using Admission.Domain;
using Admission.Features.Holds.Contracts;
using Admission.Tests.Infrastructure;
using Xunit;

namespace Admission.Tests.Features.Holds;

[Collection("Postgres")]
public class ExpiryTests : PostgresTestBase
{

  public ExpiryTests(PostgresFixture fixture) : base(fixture)
  {
  }


  [Fact]
  public async Task ConfirmAfterExpiryReturns409HoldExpired()
  {
    var client = Factory.CreateClient();
    client.WithStudentId("30000000000000001");
    var tc = new TestClient(client);

    var classResp = await tc.CreateClassAsync("Expiry Class", 1);
    var classId = classResp.Id;

    var hold = await tc.ApplyAsync(classId);
    Assert.Equal(HoldStatus.Held, hold.Status);

    // Advance time past expiry
    var timeProvider = Factory.GetTimeProvider();
    timeProvider.Advance(TimeSpan.FromSeconds(2)); // HOLD_DURATION_SECONDS=1

    // Confirm should fail with HOLD_EXPIRED
    var confirmResp = await tc.ConfirmRawAsync(hold.HoldId);
    Assert.Equal(HttpStatusCode.Conflict, confirmResp.StatusCode);

    // GET /holds/{id} should read as EXPIRED
    var holdResp = await tc.GetHoldAsync(hold.HoldId);
    Assert.Equal(HoldStatus.Expired, holdResp.Status);
  }

  [Fact]
  public async Task ExpiredHoldFreesSeatForNewStudent()
  {
    var client1 = Factory.CreateClient();
    client1.WithStudentId("30000000000000002");
    var tc1 = new TestClient(client1);

    var classResp = await tc1.CreateClassAsync("Expiry Seat Class", 1);
    var classId = classResp.Id;

    var hold = await tc1.ApplyAsync(classId);

    var classes = await tc1.ListClassesAsync();
    var theClass = Assert.Single(classes, c => c.Id == classId);
    Assert.Equal(0, theClass.AvailableSeats);

    // Advance time past expiry
    Factory.GetTimeProvider().Advance(TimeSpan.FromSeconds(2));

    // Another student can now apply
    var client2 = Factory.CreateClient();
    client2.WithStudentId("30000000000000003");
    var tc2 = new TestClient(client2);

    var newHold = await tc2.ApplyAsync(classId);
    Assert.Equal(HoldStatus.Held, newHold.Status);

    classes = await tc2.ListClassesAsync();
    theClass = Assert.Single(classes, c => c.Id == classId);
    Assert.Equal(0, theClass.AvailableSeats);
  }
}
