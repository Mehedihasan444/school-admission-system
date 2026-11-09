using System.Net;
using Admission.Domain;
using Admission.Features.Classes.Contracts;
using Admission.Features.Holds.Contracts;
using Admission.Tests.Infrastructure;
using Xunit;

namespace Admission.Tests.Features.Holds;

[Collection("Postgres")]
public class DuplicateStudentTests : PostgresTestBase
{

  public DuplicateStudentTests(PostgresFixture fixture) : base(fixture)
  {
  }


  [Fact]
  public async Task SameStudentAppliesTwiceSameClassSecondGets409()
  {
    var client = Factory.CreateClient();
    client.WithStudentId("20000000000000001");
    var tc = new TestClient(client);

    var classResp = await tc.CreateClassAsync("Dup Class", 1);
    var classId = classResp.Id;

    var first = await tc.ApplyAsync(classId);
    Assert.Equal(HoldStatus.Held, first.Status);

    var second = await tc.ApplyRawAsync(classId);
    Assert.Equal(HttpStatusCode.Conflict, second.StatusCode);
  }

  [Fact]
  public async Task SameStudentParallelDuplicatesExactlyOneHold()
  {
    var client = Factory.CreateClient();
    client.WithStudentId("20000000000000002");
    var testClient = new TestClient(client);

    var classResp = await testClient.CreateClassAsync("Parallel Dup Class", 1);
    var classId = classResp.Id;

    // Fire 50 parallel applies from the SAME student
    var tasks = Enumerable.Range(1, 50)
        .Select(async _ =>
        {
          using var scopedClient = Factory.CreateClient();
          scopedClient.WithStudentId("20000000000000002");
          return await new TestClient(scopedClient).ApplyRawAsync(classId);
        });

    var results = await Task.WhenAll(tasks);
    var created = results.Count(r => r.StatusCode == HttpStatusCode.Created);
    var conflicts = results.Count(r => r.StatusCode == HttpStatusCode.Conflict);

    Assert.Equal(1, created);
    Assert.Equal(49, conflicts);

    // Class should show exactly 1 held seat
    var classes = await testClient.ListClassesAsync();
    var theClass = Assert.Single(classes, c => c.Id == classId);
    Assert.Equal(1, theClass.HeldSeats);
    Assert.Equal(0, theClass.AvailableSeats);
  }
}
