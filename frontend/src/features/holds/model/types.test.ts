import { describe, expect, it } from "vitest"

import {
  effectiveStatus,
  getClassApplyState,
  getHoldActions,
  isAwaitingPayment,
  isTerminal,
} from "@/features/holds/model/types"
import { messages } from "@/shared/i18n/messages.bn"
import type { MyHold } from "@/features/holds/model/types"

const NOW = Date.parse("2026-01-01T00:00:00Z")

function mkHold(overrides: Partial<MyHold> = {}): MyHold {
  return {
    holdId: "h-1",
    classId: "c-1",
    studentId: "s-1",
    className: "Class 6 - Morning Shift",
    status: "HELD",
    expiresAt: "2026-01-01T00:00:00Z",
    ...overrides,
  } as MyHold
}

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

describe("getHoldActions", () => {
  it("HELD -> confirm + cancel enabled, countdown, no notice", () => {
    const actions = getHoldActions("HELD")
    expect(actions.canConfirm).toBe(true)
    expect(actions.canCancel).toBe(true)
    expect(actions.showCountdown).toBe(true)
    expect(actions.showApplyAgainHint).toBe(false)
    expect(actions.confirmLabel).toBe(messages.holds.pay)
    expect(actions.cancelLabel).toBe(messages.holds.cancel)
    expect(actions.notice).toBeNull()
  })

  it("CONFIRMED -> no actions, notice only", () => {
    const actions = getHoldActions("CONFIRMED")
    expect(actions.canConfirm).toBe(false)
    expect(actions.canCancel).toBe(false)
    expect(actions.showCountdown).toBe(false)
    expect(actions.showApplyAgainHint).toBe(false)
    expect(actions.confirmLabel).toBe(messages.holds.confirmedNotice)
    expect(actions.cancelLabel).toBe(messages.holds.confirmedNotice)
    expect(actions.notice).toBe(messages.holds.confirmedNotice)
  })

  it("EXPIRED -> no actions, apply-again hint", () => {
    const actions = getHoldActions("EXPIRED")
    expect(actions.canConfirm).toBe(false)
    expect(actions.canCancel).toBe(false)
    expect(actions.showCountdown).toBe(false)
    expect(actions.showApplyAgainHint).toBe(true)
    expect(actions.confirmLabel).toBe(messages.holds.expiredNotice)
    expect(actions.cancelLabel).toBe(messages.holds.expiredNotice)
    expect(actions.notice).toContain(messages.holds.applyAgain)
  })

  it("CANCELLED -> no actions, apply-again hint", () => {
    const actions = getHoldActions("CANCELLED")
    expect(actions.canConfirm).toBe(false)
    expect(actions.canCancel).toBe(false)
    expect(actions.showCountdown).toBe(false)
    expect(actions.showApplyAgainHint).toBe(true)
    expect(actions.confirmLabel).toBe(messages.holds.cancelledNotice)
    expect(actions.cancelLabel).toBe(messages.holds.cancelledNotice)
    expect(actions.notice).toContain(messages.holds.applyAgain)
  })
})

describe("getClassApplyState", () => {
  it("empty class -> CAN_APPLY", () => {
    expect(getClassApplyState("class-1", [], NOW)).toBe("CAN_APPLY")
  })

  it("HELD class -> HELD", () => {
    expect(
      getClassApplyState(
        "class-1",
        [
          mkHold({
            classId: "class-1",
            status: "HELD",
            expiresAt: "2026-01-02T00:00:00Z",
          }),
        ],
        NOW
      )
    ).toBe("HELD")
  })

  it("CONFIRMED class -> CONFIRMED", () => {
    expect(
      getClassApplyState(
        "class-1",
        [
          mkHold({
            classId: "class-1",
            status: "CONFIRMED",
            expiresAt: "2026-01-02T00:00:00Z",
          }),
        ],
        NOW
      )
    ).toBe("CONFIRMED")
  })

  it("EXPIRED HELD class -> CAN_APPLY", () => {
    expect(
      getClassApplyState(
        "class-1",
        [
          mkHold({
            classId: "class-1",
            status: "HELD",
            expiresAt: "2025-12-31T00:00:00Z",
          }),
        ],
        NOW
      )
    ).toBe("CAN_APPLY")
  })

  it("multiple holds, HELD wins", () => {
    expect(
      getClassApplyState(
        "class-1",
        [
          mkHold({
            classId: "class-1",
            status: "CONFIRMED",
            expiresAt: "2026-01-02T00:00:00Z",
          }),
          mkHold({
            classId: "class-1",
            status: "HELD",
            expiresAt: "2026-01-03T00:00:00Z",
          }),
        ],
        NOW
      )
    ).toBe("HELD")
  })

  it("identical expiry times, most recent status wins (CONFIRMED)", () => {
    expect(
      getClassApplyState(
        "class-1",
        [
          mkHold({
            classId: "class-1",
            status: "HELD",
            expiresAt: "2026-01-02T00:00:00Z",
          }),
          mkHold({
            classId: "class-1",
            status: "CONFIRMED",
            expiresAt: "2026-01-02T00:00:00Z",
          }),
        ],
        NOW
      )
    ).toBe("CONFIRMED")
  })

  it("class with EXPIRED HELD only -> CAN_APPLY", () => {
    expect(
      getClassApplyState(
        "class-1",
        [
          mkHold({
            classId: "class-1",
            status: "HELD",
            expiresAt: "2025-12-31T00:00:00Z",
          }),
        ],
        NOW
      )
    ).toBe("CAN_APPLY")
  })

  it("class with both HELD and CANCELLED -> HELD", () => {
    expect(
      getClassApplyState(
        "class-1",
        [
          mkHold({
            classId: "class-1",
            status: "HELD",
            expiresAt: "2026-01-02T00:00:00Z",
          }),
          mkHold({
            classId: "class-1",
            status: "CANCELLED",
            expiresAt: "2026-01-03T00:00:00Z",
          }),
        ],
        NOW
      )
    ).toBe("HELD")
  })
})
