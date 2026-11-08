namespace Admission.Common.Http;

public static class RouteParsing
{
  public static bool TryParseId(string? value, out Guid id) =>
      Guid.TryParse(value, out id);
}
