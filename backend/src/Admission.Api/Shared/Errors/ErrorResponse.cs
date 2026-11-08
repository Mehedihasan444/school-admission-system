namespace Admission.Common.Errors;

public record ErrorBody(string Code, string Message);

public record ErrorResponse(ErrorBody Error);
