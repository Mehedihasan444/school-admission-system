import { isApiError } from "@/shared/api/ApiError"
import { messages } from "@/shared/i18n/messages.bn"

export const errorMessages: Record<string, string> = {
  CLASS_FULL: messages.errors.classFull,
  HOLD_EXPIRED: messages.errors.holdExpired,
  ALREADY_APPLIED: messages.errors.alreadyApplied,
  INVALID_STUDENT_ID: messages.errors.invalidStudentId,
  VALIDATION_ERROR: messages.errors.validationError,
  CLASS_NOT_FOUND: messages.errors.classNotFound,
  HOLD_NOT_FOUND: messages.errors.holdNotFound,
  HOLD_CANCELLED: messages.errors.holdCancelled,
  HOLD_ALREADY_CONFIRMED: messages.errors.holdAlreadyConfirmed,
  NETWORK: messages.errors.network,
}

export function toMessage(error: unknown): string {
  if (isApiError(error)) {
    return errorMessages[error.code] ?? messages.errors.unknown
  }
  return messages.errors.unknown
}
