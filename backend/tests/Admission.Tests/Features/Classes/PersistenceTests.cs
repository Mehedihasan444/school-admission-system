using System.Net.Http.Json;
using Admission.Features.Classes.Contracts;
using Admission.Tests.Infrastructure;
using Xunit;

namespace Admission.Tests.Features.Classes;

[Collection("Postgres")]
public class PersistenceTests : PostgresTestBase
{

  public PersistenceTests(PostgresFixture fixture) : base(fixture)
  {
  }


  [Fact]
  public async Task DataPersistsAcrossNewHostOnSameDatabase()
  {
    // Create class with first host
    var client1 = Factory.CreateClient();
    client1.WithStudentId("70000000000000001");
    var tc1 = new TestClient(client1);

    var classResp = await tc1.CreateClassAsync("Persistence Class", 5);
    var classId = classResp.Id;

    // Create a NEW host (new ApiFactory) against the same DB
    using var factory2 = new ApiFactory(Fixture); // same fixture, same container
    var client2 = factory2.CreateClient();
    client2.WithStudentId("70000000000000002");
    var tc2 = new TestClient(client2);

    // Data should still be visible
    var classes = await tc2.ListClassesAsync();
    var persisted = Assert.Single(classes, c => c.Id == classId);
    Assert.Equal("Persistence Class", persisted.Name);
    Assert.Equal(5, persisted.TotalSeats);
  }
}
