import { ApiError } from "@/shared/api/httpClient.ts"
import { messages } from "@/shared/i18n/messages.bn.ts"

export const errorMessages: Record<string, string> = {
  CLASS_FULL: messages.classFull,
  HOLD_EXPIRED: messages.holdExpired,
  ALREADY_APPLIED: messages.alreadyApplied,
  INVALID_STUDENT_ID: messages.invalidStudentId,
  VALIDATION_ERROR: messages.validationError,
  NETWORK: messages.networkError,
} as const

export function toMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return errorMessages[error.code] ?? messages.unknownError
  }
  return messages.unknownError
}
