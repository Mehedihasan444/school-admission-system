using Admission.Common.Errors;

using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;

namespace Admission.Common.Errors;

public sealed class GlobalExceptionHandler(ILogger<GlobalExceptionHandler> logger) : IExceptionHandler
{
  private static readonly Action<ILogger, Exception?> logUnhandled =
      LoggerMessage.Define(
          LogLevel.Error,
          new EventId(1, "UnhandledException"),
          "Unhandled exception processing request");

  public async ValueTask<bool> TryHandleAsync(
      HttpContext httpContext,
      Exception exception,
      CancellationToken cancellationToken)
  {
    if (exception is AppException appException)
    {
      await WriteErrorAsync(httpContext, appException.Status, appException.Code, appException.Message, cancellationToken);
      return true;
    }

    // Minimal API JSON binding failures surface as BadHttpRequestException
    // (malformed JSON, wrong content type). They are client errors, not 500s.
    if (exception is BadHttpRequestException)
    {
      await WriteErrorAsync(
          httpContext,
          StatusCodes.Status400BadRequest,
          ErrorCodes.ValidationError,
          ErrorMessages.ValidationError,
          cancellationToken);
      return true;
    }

    logUnhandled(logger, exception);

    await WriteErrorAsync(
        httpContext,
        StatusCodes.Status500InternalServerError,
        ErrorCodes.InternalError,
        ErrorMessages.InternalError,
        cancellationToken);
    return true;
  }

  private static Task WriteErrorAsync(
      HttpContext httpContext,
      int statusCode,
      string code,
      string message,
      CancellationToken cancellationToken)
  {
    httpContext.Response.StatusCode = statusCode;
    return httpContext.Response.WriteAsJsonAsync(
        new ErrorResponse(new ErrorBody(code, message)),
        cancellationToken);
  }
}
