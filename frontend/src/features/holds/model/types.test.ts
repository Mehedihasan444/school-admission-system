import { describe, expect, it } from "vitest"

import {
  effectiveStatus,
  holdActionsFor,
  isAwaitingPayment,
  isTerminal,
} from "@/features/holds/model/types"
import { messages } from "@/shared/i18n/messages.bn"

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

describe("holdActionsFor", () => {
  it("HELD: confirm + cancel enabled, countdown shown, no notice", () => {
    const actions = holdActionsFor("HELD")
    expect(actions.canConfirm).toBe(true)
    expect(actions.canCancel).toBe(true)
    expect(actions.showCountdown).toBe(true)
    expect(actions.showApplyAgainHint).toBe(false)
    expect(actions.confirmLabel).toBe(messages.holds.pay)
    expect(actions.notice).toBeNull()
  })

  it("CONFIRMED: no actions, success notice only", () => {
    const actions = holdActionsFor("CONFIRMED")
    expect(actions.canConfirm).toBe(false)
    expect(actions.canCancel).toBe(false)
    expect(actions.showCountdown).toBe(false)
    expect(actions.showApplyAgainHint).toBe(false)
    expect(actions.confirmLabel).toBe(messages.status.CONFIRMED)
    expect(actions.cancelLabel).toBe(messages.status.CONFIRMED)
    expect(actions.notice).toBe(messages.holds.confirmedNotice)
  })

  it("EXPIRED: no actions, apply-again hint notice", () => {
    const actions = holdActionsFor("EXPIRED")
    expect(actions.canConfirm).toBe(false)
    expect(actions.canCancel).toBe(false)
    expect(actions.showCountdown).toBe(false)
    expect(actions.showApplyAgainHint).toBe(true)
    expect(actions.confirmLabel).toBe(messages.status.EXPIRED)
    expect(actions.cancelLabel).toBe(messages.status.EXPIRED)
    expect(actions.notice).toContain(messages.holds.applyAgain)
  })

  it("CANCELLED: no actions, apply-again hint notice", () => {
    const actions = holdActionsFor("CANCELLED")
    expect(actions.canConfirm).toBe(false)
    expect(actions.canCancel).toBe(false)
    expect(actions.showCountdown).toBe(false)
    expect(actions.showApplyAgainHint).toBe(true)
    expect(actions.confirmLabel).toBe(messages.status.CANCELLED)
    expect(actions.cancelLabel).toBe(messages.status.CANCELLED)
    expect(actions.notice).toContain(messages.holds.applyAgain)
  })
})
