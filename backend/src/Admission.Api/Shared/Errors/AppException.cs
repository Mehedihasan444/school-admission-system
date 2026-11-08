namespace Admission.Common.Errors;

public sealed class AppException(int status, string code, string message) : Exception(message)
{
  public int Status { get; } = status;
  public string Code { get; } = code;

  public static AppException ValidationError(string field, string reason) =>
      new(400, ErrorCodes.ValidationError, $"{field}: {reason}");

  public static AppException InvalidStudentId() =>
      new(400, ErrorCodes.InvalidStudentId, ErrorMessages.InvalidStudentId);

  public static AppException ClassNotFound() =>
      new(404, ErrorCodes.ClassNotFound, ErrorMessages.ClassNotFound);

  public static AppException HoldNotFound() =>
      new(404, ErrorCodes.HoldNotFound, ErrorMessages.HoldNotFound);

  public static AppException ClassFull() =>
      new(409, ErrorCodes.ClassFull, ErrorMessages.ClassFull);

  public static AppException AlreadyApplied() =>
      new(409, ErrorCodes.AlreadyApplied, ErrorMessages.AlreadyApplied);

  public static AppException HoldExpired() =>
      new(409, ErrorCodes.HoldExpired, ErrorMessages.HoldExpired);

  public static AppException HoldCancelled() =>
      new(409, ErrorCodes.HoldCancelled, ErrorMessages.HoldCancelled);

  public static AppException HoldAlreadyConfirmed() =>
      new(409, ErrorCodes.HoldAlreadyConfirmed, ErrorMessages.HoldAlreadyConfirmed);

  public static AppException InternalError() =>
      new(500, ErrorCodes.InternalError, ErrorMessages.InternalError);
}
