namespace Admission.Common.Errors;

public static class ErrorMessages
{
  public const string ClassFull = "দুঃখিত, এই class-এ এখন কোনো seat খালি নেই।";
  public const string AlreadyApplied = "আপনি এই class-এ ইতিমধ্যে আবেদন করেছেন।";
  public const string HoldExpired = "আপনার আবেদনের মেয়াদ শেষ হয়ে গেছে।";
  public const string HoldNotFound = "আবেদনটি খুঁজে পাওয়া যায়নি।";
  public const string HoldCancelled = "এই আবেদনটি ইতিমধ্যে ক্যান্সেল করা হয়েছে।";
  public const string HoldAlreadyConfirmed = "এই আবেদনটি ইতিমধ্যে নিশ্চিত করা হয়েছে।";
  public const string ClassNotFound = "ক্লাসটি পাওয়া যায়নি।";
  public const string ValidationError = "দেওয়া তথ্যে ভুল আছে। অনুগ্রহ করে যাচাই করুন।";
  public const string InvalidStudentId = "জন্ম নিবন্ধন নম্বর ১৭ অঙ্কের হতে হবে।";
  public const string InternalError = "সার্ভারে কোনো সমস্যা হয়েছে। আবার চেষ্টা করুন।";
}
