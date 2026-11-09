import { describe, expect, it } from "vitest"

import {
  isValidStudentId,
  normalizeStudentId,
} from "@/features/student/model/studentId"

describe("isValidStudentId", () => {
  it("accepts exactly 17 digits", () => {
    expect(isValidStudentId("20152691234567890")).toBe(true)
  })

  it("accepts surrounding whitespace after normalisation", () => {
    expect(isValidStudentId("  20152691234567890  ")).toBe(true)
    expect(normalizeStudentId("  20152691234567890  ")).toBe(
      "20152691234567890"
    )
  })

  it.each([
    "",
    "1234567890123456",
    "123456789012345678",
    "2015269123456789a",
    "২০১৫২৬৯১২৩৪৫৬৭৮৯০",
  ])("rejects %s", (value) => {
    expect(isValidStudentId(value)).toBe(false)
  })
})
