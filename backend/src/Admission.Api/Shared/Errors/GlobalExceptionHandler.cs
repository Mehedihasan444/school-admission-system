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
      httpContext.Response.StatusCode = appException.Status;
      await httpContext.Response.WriteAsJsonAsync(
          new ErrorResponse(new ErrorBody(appException.Code, appException.Message)),
          cancellationToken);
      return true;
    }

    logUnhandled(logger, exception);

    httpContext.Response.StatusCode = StatusCodes.Status500InternalServerError;
    await httpContext.Response.WriteAsJsonAsync(
        new ErrorResponse(new ErrorBody(ErrorCodes.InternalError, ErrorMessages.InternalError)),
        cancellationToken);
    return true;
  }
}
