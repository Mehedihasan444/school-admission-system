using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Admission.Domain;
using Admission.Features.Classes.Contracts;
using Admission.Features.Holds.Contracts;
using Admission.Tests.Infrastructure;
using Xunit;

namespace Admission.Tests.Features.Classes;

[Collection("Postgres")]
public class ContractTests : PostgresTestBase
{

  public ContractTests(PostgresFixture fixture) : base(fixture)
  {
  }


  [Fact]
  public async Task All8EndpointsMatchContractShapes()
  {
    var client = Factory.CreateClient();
    client.WithStudentId("60000000000000001");
    var tc = new TestClient(client);

    // 1. POST /classes -> 201 { id, name, totalSeats }
    var createResp = await tc.CreateClassAsync("Contract Class", 10);
    Assert.NotNull(createResp.Id);
    Assert.Equal("Contract Class", createResp.Name);
    Assert.Equal(10, createResp.TotalSeats);
    var classId = createResp.Id;

    // 2. GET /classes -> 200 [{ id, name, totalSeats, heldSeats, confirmedSeats, availableSeats }]
    var classes = await tc.ListClassesAsync();
    var listed = Assert.Single(classes, c => c.Id == classId);
    Assert.Equal(classId, listed.Id);
    Assert.Equal("Contract Class", listed.Name);
    Assert.Equal(10, listed.TotalSeats);
    Assert.Equal(0, listed.HeldSeats);
    Assert.Equal(0, listed.ConfirmedSeats);
    Assert.Equal(10, listed.AvailableSeats);

    // 3. GET /classes/{classId} -> 200 same shape
    var getResp = await tc.GetClassAsync(classId);
    Assert.NotNull(getResp);
    Assert.Equal(classId, getResp.Id);
    Assert.Equal(10, getResp.TotalSeats);

    // 3b. Invalid GUID -> 404
    var invalidGuidResp = await client.GetAsync("/classes/not-a-guid");
    Assert.Equal(HttpStatusCode.NotFound, invalidGuidResp.StatusCode);

    // 3c. Unknown GUID -> 404
    var unknownResp = await client.GetAsync("/classes/" + Guid.NewGuid());
    Assert.Equal(HttpStatusCode.NotFound, unknownResp.StatusCode);

    // 4. POST /classes/{classId}/holds -> 201 { holdId, classId, studentId, status, expiresAt }
    var hold = await tc.ApplyAsync(classId);
    Assert.NotNull(hold.HoldId);
    Assert.Equal(classId, hold.ClassId);
    Assert.Equal("60000000000000001", hold.StudentId);
    Assert.Equal(HoldStatus.Held, hold.Status);
    Assert.NotEqual(default(DateTimeOffset), hold.ExpiresAt);

    // 5. GET /holds/{holdId} -> 200 { holdId, classId, status, expiresAt }
    var holdResp = await tc.GetHoldAsync(hold.HoldId);
    Assert.Equal(hold.HoldId, holdResp.HoldId);
    Assert.Equal(classId, holdResp.ClassId);
    Assert.Equal(HoldStatus.Held, holdResp.Status);

    // 6. POST /holds/{holdId}/confirm -> 200 { holdId, status }
    var confirmResp = await tc.ConfirmRawAsync(hold.HoldId);
    Assert.Equal(HttpStatusCode.OK, confirmResp.StatusCode);
    var confirmBody = await confirmResp.Content.ReadFromJsonAsync<ConfirmHoldResponse>(TestClient.JsonSerializerOptions);
    Assert.NotNull(confirmBody);
    Assert.Equal(hold.HoldId, confirmBody.HoldId);
    Assert.Equal(HoldStatus.Confirmed, confirmBody.Status);

    // 7. DELETE /holds/{holdId} - use a fresh class so the first hold stays active
    var secondClass = await tc.CreateClassAsync("Contract Class Cancel", 1);
    var hold2 = await tc.ApplyAsync(secondClass.Id);
    var cancelResp = await tc.CancelRawAsync(hold2.HoldId);
    Assert.Equal(HttpStatusCode.NoContent, cancelResp.StatusCode);

    // 8. GET /me/holds -> 200 [{ holdId, classId, className, status, expiresAt }]
    var myHolds = await tc.MyHoldsAsync();
    Assert.Equal(2, myHolds.Count);
    var myHold = Assert.Single(myHolds, h => h.HoldId == hold.HoldId);
    Assert.Equal(classId, myHold.ClassId);
    Assert.Equal("Contract Class", myHold.ClassName);
    Assert.Equal(HoldStatus.Confirmed, myHold.Status);
  }
}
