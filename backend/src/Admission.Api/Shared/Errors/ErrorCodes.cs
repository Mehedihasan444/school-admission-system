namespace Admission.Common.Errors;

public static class ErrorCodes
{
  public const string ValidationError = "VALIDATION_ERROR";
  public const string InvalidStudentId = "INVALID_STUDENT_ID";
  public const string ClassNotFound = "CLASS_NOT_FOUND";
  public const string HoldNotFound = "HOLD_NOT_FOUND";
  public const string ClassFull = "CLASS_FULL";
  public const string AlreadyApplied = "ALREADY_APPLIED";
  public const string HoldExpired = "HOLD_EXPIRED";
  public const string HoldCancelled = "HOLD_CANCELLED";
  public const string HoldAlreadyConfirmed = "HOLD_ALREADY_CONFIRMED";
  public const string InternalError = "INTERNAL_ERROR";
}
