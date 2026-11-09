using System.Net;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using Admission.Tests.Infrastructure;
using Xunit;

namespace Admission.Tests.Features.Classes;

[Collection("Postgres")]
public class ValidationTests : PostgresTestBase
{

  public ValidationTests(PostgresFixture fixture) : base(fixture)
  {
  }


  [Theory]
  [InlineData("")]
  [InlineData("   ")]
  public async Task EmptyOrWhitespaceNameReturns400ValidationError(string name)
  {
    var client = Factory.CreateClient();
    var resp = await client.PostAsJsonAsync("/classes", new { name, totalSeats = 10 });
    await AssertValidationErrorAsync(resp);
  }

  [Theory]
  [InlineData(0)]
  [InlineData(-1)]
  [InlineData(100001)]
  public async Task InvalidTotalSeatsReturns400ValidationError(int totalSeats)
  {
    var client = Factory.CreateClient();
    var resp = await client.PostAsJsonAsync("/classes", new { name = "Valid Name", totalSeats });
    await AssertValidationErrorAsync(resp);
  }

  [Fact]
  public async Task NameLongerThan200CharactersReturns400()
  {
    var client = Factory.CreateClient();
    var resp = await client.PostAsJsonAsync("/classes", new { name = new string('a', 201), totalSeats = 1 });
    await AssertValidationErrorAsync(resp);
  }

  [Fact]
  public async Task MissingNameReturns400()
  {
    var client = Factory.CreateClient();
    var resp = await client.PostAsJsonAsync("/classes", new { totalSeats = 1 });
    await AssertValidationErrorAsync(resp);
  }

  [Fact]
  public async Task MissingBodyReturns400()
  {
    var client = Factory.CreateClient();
    var resp = await client.PostAsync(
        "/classes",
        new StringContent(string.Empty, Encoding.UTF8, "application/json"));
    await AssertValidationErrorAsync(resp);
  }

  [Fact]
  public async Task MalformedJsonReturns400()
  {
    var client = Factory.CreateClient();
    var resp = await client.PostAsync(
        "/classes",
        new StringContent("{ not-json", Encoding.UTF8, "application/json"));
    await AssertValidationErrorAsync(resp);
  }

  [Fact]
  public async Task NonIntegerTotalSeatsReturns400()
  {
    var client = Factory.CreateClient();
    var resp = await client.PostAsync(
        "/classes",
        new StringContent("""{"name":"Class","totalSeats":"abc"}""", Encoding.UTF8, "application/json"));
    await AssertValidationErrorAsync(resp);
  }

  [Fact]
  public async Task MissingStudentIdOnApplyReturns400()
  {
    var client = Factory.CreateClient();
    var tc = new TestClient(client);

    var classResp = await tc.CreateClassAsync("Validation Class", 1);
    var resp = await tc.ApplyRawAsync(classResp.Id);

    await AssertErrorAsync(resp, HttpStatusCode.BadRequest, "INVALID_STUDENT_ID");
  }

  [Theory]
  [InlineData("123")]
  [InlineData("1234567890123456")] // 16 digits
  [InlineData("123456789012345678")] // 18 digits
  [InlineData("abcdefghijklmnopq")] // non-digits
  public async Task InvalidStudentIdFormatReturns400(string studentId)
  {
    var client = Factory.CreateClient();
    client.DefaultRequestHeaders.Add("X-Student-Id", studentId);
    var tc = new TestClient(client);

    var classResp = await tc.CreateClassAsync("Validation Id Class", 1);
    var resp = await tc.ApplyRawAsync(classResp.Id);

    await AssertErrorAsync(resp, HttpStatusCode.BadRequest, "INVALID_STUDENT_ID");
  }

  private static async Task AssertValidationErrorAsync(HttpResponseMessage resp) =>
      await AssertErrorAsync(resp, HttpStatusCode.BadRequest, "VALIDATION_ERROR");

  private static async Task AssertErrorAsync(HttpResponseMessage resp, HttpStatusCode status, string code)
  {
    Assert.Equal(status, resp.StatusCode);
    var body = await resp.Content.ReadFromJsonAsync<JsonDocument>();
    Assert.NotNull(body);
    Assert.Equal(code, body.RootElement.GetProperty("error").GetProperty("code").GetString());
  }
}
