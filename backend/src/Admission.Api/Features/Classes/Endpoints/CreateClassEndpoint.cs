using System.Text.Json;
using Admission.Common.Errors;
using Admission.Features.Classes.Application;
using Admission.Features.Classes.Contracts;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;

namespace Admission.Features.Classes.Endpoints;

/// <summary>
/// <c>POST /classes</c> (PRD 5.1). Thin: parse body, call one handler, map result.
/// The body is deserialised explicitly so malformed or missing JSON produces the
/// same <c>{ "error": { "code", "message" } }</c> envelope as every other error.
/// </summary>
public static class CreateClassEndpoint
{
  public static void Map(IEndpointRouteBuilder app) =>
      app.MapPost("/classes", Handle);

  private static async Task<IResult> Handle(
      HttpRequest request,
      CreateClassHandler handler,
      CancellationToken ct)
  {
    var body = await ReadRequestAsync(request, ct);
    var response = await handler.Handle(body, ct);
    return Results.Created($"/classes/{response.Id}", response);
  }

  private static async Task<CreateClassRequest> ReadRequestAsync(
      HttpRequest request,
      CancellationToken ct)
  {
    try
    {
      var body = await JsonSerializer.DeserializeAsync<CreateClassRequest>(
          request.Body,
          JsonSerializerOptions.Web,
          ct);

      return body ?? throw AppException.ValidationError("body", "request body is required");
    }
    catch (JsonException)
    {
      throw AppException.ValidationError("body", "request body is not valid JSON");
    }
    catch (NotSupportedException)
    {
      throw AppException.ValidationError("body", "request body must be JSON");
    }
  }
}
