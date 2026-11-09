import { describe, expect, it } from "vitest"

import {
  effectiveStatus,
  isAwaitingPayment,
  isTerminal,
} from "@/features/holds/model/types"

const NOW = Date.parse("2026-01-01T00:00:00Z")

describe("effectiveStatus", () => {
  it("keeps HELD before expiry", () => {
    expect(effectiveStatus("HELD", "2026-01-01T00:00:10Z", NOW)).toBe("HELD")
  })

  it("turns an overdue HELD hold into EXPIRED", () => {
    expect(effectiveStatus("HELD", "2025-12-31T23:59:59Z", NOW)).toBe("EXPIRED")
  })

  it("treats exact expiry time as expired", () => {
    expect(effectiveStatus("HELD", "2026-01-01T00:00:00Z", NOW)).toBe("EXPIRED")
  })

  it.each(["CONFIRMED", "CANCELLED", "EXPIRED"] as const)(
    "leaves %s untouched",
    (status) => {
      expect(effectiveStatus(status, "2020-01-01T00:00:00Z", NOW)).toBe(status)
    }
  )
})

describe("hold state helpers", () => {
  it("only HELD is awaiting payment", () => {
    expect(isAwaitingPayment("HELD")).toBe(true)
    expect(isAwaitingPayment("CONFIRMED")).toBe(false)
    expect(isAwaitingPayment("EXPIRED")).toBe(false)
    expect(isAwaitingPayment("CANCELLED")).toBe(false)
  })

  it("marks terminal statuses", () => {
    expect(isTerminal("HELD")).toBe(false)
    expect(isTerminal("CONFIRMED")).toBe(true)
    expect(isTerminal("EXPIRED")).toBe(true)
    expect(isTerminal("CANCELLED")).toBe(true)
  })
})
