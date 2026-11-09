import { describe, expect, it } from "vitest"

import { ApiError } from "@/shared/api/ApiError"
import { toMessage } from "@/shared/i18n/errorMessages"
import { messages } from "@/shared/i18n/messages.bn"

describe("toMessage", () => {
  it.each([
    ["CLASS_FULL", messages.errors.classFull],
    ["HOLD_EXPIRED", messages.errors.holdExpired],
    ["ALREADY_APPLIED", messages.errors.alreadyApplied],
    ["INVALID_STUDENT_ID", messages.errors.invalidStudentId],
    ["VALIDATION_ERROR", messages.errors.validationError],
    ["CLASS_NOT_FOUND", messages.errors.classNotFound],
    ["HOLD_NOT_FOUND", messages.errors.holdNotFound],
    ["HOLD_CANCELLED", messages.errors.holdCancelled],
    ["HOLD_ALREADY_CONFIRMED", messages.errors.holdAlreadyConfirmed],
    ["NETWORK", messages.errors.network],
  ])("maps %s to its Bangla message", (code, expected) => {
    expect(toMessage(new ApiError(400, code, "server text"))).toBe(expected)
  })

  it("falls back to the unknown message", () => {
    expect(toMessage(new ApiError(500, "INTERNAL_ERROR", "boom"))).toBe(
      messages.errors.unknown
    )
    expect(toMessage(new Error("boom"))).toBe(messages.errors.unknown)
  })
})
