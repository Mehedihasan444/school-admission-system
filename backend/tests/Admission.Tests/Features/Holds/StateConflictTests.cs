using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Admission.Domain;
using Admission.Tests.Infrastructure;
using Xunit;

namespace Admission.Tests.Features.Holds;

[Collection("Postgres")]
public class StateConflictTests : PostgresTestBase
{

  public StateConflictTests(PostgresFixture fixture) : base(fixture)
  {
  }


  [Fact]
  public async Task ConfirmAfterCancelReturns409HoldCancelled()
  {
    var tc = ClientFor("81000000000000001");
    var classId = (await tc.CreateClassAsync("Confirm After Cancel", 1)).Id;
    var hold = await tc.ApplyAsync(classId);

    Assert.Equal(HttpStatusCode.NoContent, (await tc.CancelRawAsync(hold.HoldId)).StatusCode);

    var resp = await tc.ConfirmRawAsync(hold.HoldId);
    await AssertErrorAsync(resp, HttpStatusCode.Conflict, "HOLD_CANCELLED");
  }

  [Fact]
  public async Task CancelTwiceReturns409HoldCancelled()
  {
    var tc = ClientFor("81000000000000002");
    var classId = (await tc.CreateClassAsync("Cancel Twice", 1)).Id;
    var hold = await tc.ApplyAsync(classId);

    Assert.Equal(HttpStatusCode.NoContent, (await tc.CancelRawAsync(hold.HoldId)).StatusCode);

    var resp = await tc.CancelRawAsync(hold.HoldId);
    await AssertErrorAsync(resp, HttpStatusCode.Conflict, "HOLD_CANCELLED");
  }

  [Fact]
  public async Task CancelAfterExpiryReturns409HoldExpired()
  {
    var tc = ClientFor("81000000000000003");
    var classId = (await tc.CreateClassAsync("Cancel After Expiry", 1)).Id;
    var hold = await tc.ApplyAsync(classId);

    Factory.GetTimeProvider().Advance(TimeSpan.FromSeconds(2));

    var resp = await tc.CancelRawAsync(hold.HoldId);
    await AssertErrorAsync(resp, HttpStatusCode.Conflict, "HOLD_EXPIRED");

    var stored = await tc.GetHoldAsync(hold.HoldId);
    Assert.Equal(HoldStatus.Expired, stored.Status);
  }

  [Fact]
  public async Task ConfirmUnknownHoldReturns404()
  {
    var tc = ClientFor("81000000000000004");
    var resp = await tc.ConfirmRawAsync(Guid.NewGuid().ToString());

    await AssertErrorAsync(resp, HttpStatusCode.NotFound, "HOLD_NOT_FOUND");
  }

  [Fact]
  public async Task ConfirmOnInvalidGuidReturns404()
  {
    var tc = ClientFor("81000000000000005");
    var resp = await tc.ConfirmRawAsync("not-a-guid");

    await AssertErrorAsync(resp, HttpStatusCode.NotFound, "HOLD_NOT_FOUND");
  }

  private TestClient ClientFor(string studentId)
  {
    var client = Factory.CreateClient();
    client.WithStudentId(studentId);
    return new TestClient(client);
  }

  private static async Task AssertErrorAsync(HttpResponseMessage resp, HttpStatusCode status, string code)
  {
    Assert.Equal(status, resp.StatusCode);
    var body = await resp.Content.ReadFromJsonAsync<JsonDocument>();
    Assert.NotNull(body);
    Assert.Equal(code, body.RootElement.GetProperty("error").GetProperty("code").GetString());
  }
}
