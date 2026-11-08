using Admission.Common.Errors;

using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;

namespace Admission.Common.Http;

public sealed class StudentIdFilter : IEndpointFilter
{
  private const int ExpectedLength = 17;

  public async ValueTask<object?> InvokeAsync(
      EndpointFilterInvocationContext context,
      EndpointFilterDelegate next)
  {
    var studentId = context.HttpContext.Request.Headers["X-Student-Id"].ToString();

    if (!IsValidStudentId(studentId))
    {
      return Results.BadRequest(
          new ErrorResponse(new ErrorBody(ErrorCodes.InvalidStudentId, ErrorMessages.InvalidStudentId)));
    }

    var studentIdContext = context.HttpContext.RequestServices
        .GetRequiredService<StudentIdContext>();
    studentIdContext.StudentId = studentId;

    return await next(context);
  }

  private static bool IsValidStudentId(string? studentId) =>
      studentId is not null &&
      studentId.Length == ExpectedLength &&
      studentId.All(char.IsDigit);
}
