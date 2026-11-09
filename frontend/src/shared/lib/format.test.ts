import { describe, expect, it } from "vitest"

import {
  formatExpiryTime,
  formatNumberBn,
  formatRemaining,
  normalizeBanglaDigits,
} from "@/shared/lib/format"

describe("normalizeBanglaDigits", () => {
  it("converts Bangla digits to Latin digits", () => {
    expect(normalizeBanglaDigits("২০১৫২৬৯১২৩৪৫৬৭৮৯০")).toBe("20152691234567890")
  })

  it("leaves Latin digits unchanged", () => {
    expect(normalizeBanglaDigits("20152691234567890")).toBe("20152691234567890")
  })

  it("mixes Bangla and Latin digits", () => {
    expect(normalizeBanglaDigits("২০১৫abc")).toBe("2015abc")
  })

  it("returns empty string for empty input", () => {
    expect(normalizeBanglaDigits("")).toBe("")
  })
})

describe("formatNumberBn", () => {
  it("formats small numbers with Bangla digits", () => {
    expect(formatNumberBn(5)).toBe("৫")
  })

  it("formats large numbers with Bangla digits", () => {
    expect(formatNumberBn(120)).toBe("১২০")
  })

  it("formats zero", () => {
    expect(formatNumberBn(0)).toBe("০")
  })
})

describe("formatRemaining", () => {
  it("formats mm:ss with Bangla digits", () => {
    expect(formatRemaining(65000)).toBe("১:০৫")
  })

  it("formats zero seconds", () => {
    expect(formatRemaining(0)).toBe("০:০০")
  })

  it("clamps negative values to zero", () => {
    expect(formatRemaining(-5000)).toBe("০:০০")
  })

  it("formats under a minute", () => {
    expect(formatRemaining(30000)).toBe("০:৩০")
  })
})

describe("formatExpiryTime", () => {
  it("returns time in bn-BD with Asia/Dhaka timezone", () => {
    const result = formatExpiryTime("2026-11-09T13:03:25Z")
    // Should contain Bangla digits
    expect(result).toMatch(/[০-৯]/)
  })

  it("handles invalid dates gracefully", () => {
    expect(formatExpiryTime("invalid")).toBe("invalid")
  })
})
