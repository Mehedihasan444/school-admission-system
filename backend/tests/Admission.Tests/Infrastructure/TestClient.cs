using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using Admission.Features.Classes.Contracts;
using Admission.Features.Holds.Contracts;

namespace Admission.Tests;

/// <summary>
/// Typed helpers around HttpClient for integration tests against the API.
/// </summary>
public sealed class TestClient
{
  public static readonly JsonSerializerOptions JsonSerializerOptions = new()
  {
    PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
    Converters = { new JsonStringEnumConverter(JsonNamingPolicy.SnakeCaseUpper) }
  };

  private readonly HttpClient _http;

  public TestClient(HttpClient http) => _http = http;

  public async Task<ClassResponse> CreateClassAsync(string name, int totalSeats)
  {
    var resp = await _http.PostAsJsonAsync("/classes", new { name, totalSeats });
    resp.EnsureSuccessStatusCode();
    return await resp.Content.ReadFromJsonAsync<ClassResponse>(JsonSerializerOptions)
        ?? throw new InvalidOperationException("Empty response body for POST /classes");
  }

  public async Task<HttpResponseMessage> CreateClassRawAsync(string name, int totalSeats) =>
      await _http.PostAsJsonAsync("/classes", new { name, totalSeats });

  public async Task<List<ClassResponse>> ListClassesAsync()
  {
    var resp = await _http.GetAsync("/classes");
    resp.EnsureSuccessStatusCode();
    return await resp.Content.ReadFromJsonAsync<List<ClassResponse>>(JsonSerializerOptions)
        ?? new List<ClassResponse>();
  }

  public async Task<ClassResponse?> GetClassAsync(string classId)
  {
    var resp = await _http.GetAsync($"/classes/{classId}");
    if (resp.StatusCode == System.Net.HttpStatusCode.NotFound)
      return null;
    resp.EnsureSuccessStatusCode();
    return await resp.Content.ReadFromJsonAsync<ClassResponse>(JsonSerializerOptions);
  }

  public async Task<HttpResponseMessage> ApplyRawAsync(string classId) =>
      await _http.PostAsync($"/classes/{classId}/holds", null);

  public async Task<ApplyHoldResponse> ApplyAsync(string classId)
  {
    var resp = await _http.PostAsync($"/classes/{classId}/holds", null);
    resp.EnsureSuccessStatusCode();
    return await resp.Content.ReadFromJsonAsync<ApplyHoldResponse>(JsonSerializerOptions)
        ?? throw new InvalidOperationException("Empty response body for apply");
  }

  public async Task<HttpResponseMessage> ConfirmRawAsync(string holdId) =>
      await _http.PostAsync($"/holds/{holdId}/confirm", null);

  public async Task<HttpResponseMessage> CancelRawAsync(string holdId) =>
      await _http.DeleteAsync($"/holds/{holdId}");

  public async Task<HoldResponse> GetHoldAsync(string holdId)
  {
    var resp = await _http.GetAsync($"/holds/{holdId}");
    resp.EnsureSuccessStatusCode();
    return await resp.Content.ReadFromJsonAsync<HoldResponse>(JsonSerializerOptions)
        ?? throw new InvalidOperationException("Empty response body for GET /holds");
  }

  public async Task<List<MyHoldResponse>> MyHoldsAsync()
  {
    var resp = await _http.GetAsync("/me/holds");
    resp.EnsureSuccessStatusCode();
    return await resp.Content.ReadFromJsonAsync<List<MyHoldResponse>>(JsonSerializerOptions)
        ?? new List<MyHoldResponse>();
  }
}
