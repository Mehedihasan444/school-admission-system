import { messages } from "@/shared/i18n/messages.bn"

export type HoldStatus = "HELD" | "CONFIRMED" | "EXPIRED" | "CANCELLED"
export type ClassApplyState = "CAN_APPLY" | "HELD" | "CONFIRMED"

export interface Hold {
  holdId: string
  classId: string
  studentId: string
  status: HoldStatus
  expiresAt: string
}

export interface MyHold {
  holdId: string
  classId: string
  className: string
  status: HoldStatus
  expiresAt: string
}

export interface ApplyHoldInput {
  classId: string
  studentId: string
}

export interface HoldActionInput {
  holdId: string
  studentId: string
}

export interface HoldActions {
  canConfirm: boolean
  canCancel: boolean
  showCountdown: boolean
  showApplyAgainHint: boolean
  confirmLabel: string | null
  cancelLabel: string | null
  notice: string | null
}

const TERMINAL_STATUSES: ReadonlySet<HoldStatus> = new Set([
  "CONFIRMED",
  "EXPIRED",
  "CANCELLED",
])

/**
 * Determine what the UI should show for a class regarding the apply button.
 * Sources: all existing holds for the class across ALL students.
 * Rule: HELD or unexpired CONFIRMED → not applicable (cannot apply again)
 * Rule: EXPIRED/CANCELLED → can apply again (including expired HELD)
 * Returns: CAN_APPLY | HELD | CONFIRMED
 */
export function getClassApplyState(
  classId: string,
  allHolds: MyHold[],
  nowMs: number = Date.now()
): ClassApplyState {
  const holdsForClass = allHolds.filter((h) => h.classId === classId)
  if (holdsForClass.length === 0) return "CAN_APPLY"

  const activeHolds = holdsForClass.filter((h) => {
    if (h.status === "HELD") {
      return Date.parse(h.expiresAt) > nowMs
    }
    return h.status === "CONFIRMED"
  })

  if (activeHolds.length === 0) return "CAN_APPLY"

  const mostRecent = activeHolds.reduce((latest, h) => {
    const latestTime = Date.parse(latest.expiresAt)
    const hTime = Date.parse(h.expiresAt)
    if (hTime > latestTime) return h
    if (
      hTime === latestTime &&
      h.status === "CONFIRMED" &&
      latest.status === "HELD"
    )
      return h
    return latest
  })

  return mostRecent.status as ClassApplyState
}

/**
 * A stored HELD hold whose expiry has passed behaves as EXPIRED everywhere,
 * even before the background sweeper has updated the row.
 */
export function effectiveStatus(
  status: HoldStatus,
  expiresAt: string,
  nowMs: number
): HoldStatus {
  if (status !== "HELD") {
    return status
  }

  const expiresMs = Date.parse(expiresAt)
  if (Number.isNaN(expiresMs)) {
    return status
  }

  return expiresMs <= nowMs ? "EXPIRED" : status
}

export function isAwaitingPayment(status: HoldStatus): boolean {
  return status === "HELD"
}

export function isTerminal(status: HoldStatus): boolean {
  return TERMINAL_STATUSES.has(status)
}

/**
 * Which actions the UI should show for a hold with a given effective status.
 * HELD -> primary "ভর্তি ফি দিন" + secondary "বাতিল করুন"
 * CONFIRMED/EXPIRED/CANCELLED -> no buttons (muted dash)
 */
export function getHoldActions(effectiveStatus: HoldStatus): HoldActions {
  switch (effectiveStatus) {
    case "HELD":
      return {
        canConfirm: true,
        canCancel: true,
        showCountdown: true,
        showApplyAgainHint: false,
        confirmLabel: messages.holds.pay,
        cancelLabel: messages.holds.cancel,
        notice: null,
      }
    case "CONFIRMED":
      return {
        canConfirm: false,
        canCancel: false,
        showCountdown: false,
        showApplyAgainHint: false,
        confirmLabel: messages.holds.confirmedNotice,
        cancelLabel: messages.holds.confirmedNotice,
        notice: messages.holds.confirmedNotice,
      }
    case "EXPIRED":
      return {
        canConfirm: false,
        canCancel: false,
        showCountdown: false,
        showApplyAgainHint: true,
        confirmLabel: messages.holds.expiredNotice,
        cancelLabel: messages.holds.expiredNotice,
        notice: `${messages.holds.expiredNotice} ${messages.holds.applyAgain}`,
      }
    case "CANCELLED":
      return {
        canConfirm: false,
        canCancel: false,
        showCountdown: false,
        showApplyAgainHint: true,
        confirmLabel: messages.holds.cancelledNotice,
        cancelLabel: messages.holds.cancelledNotice,
        notice: `${messages.holds.cancelledNotice} ${messages.holds.applyAgain}`,
      }
  }
}
