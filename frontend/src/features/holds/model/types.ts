import { messages } from "@/shared/i18n/messages.bn"

export type HoldStatus = "HELD" | "CONFIRMED" | "EXPIRED" | "CANCELLED"

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
 * A stored HELD hold whose expiry has passed behaves as EXPIRED everywhere,
 * even before the background sweeper has updated the row (PRD 3.3).
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
 * Pure decision: what actions and notices the UI should show for a hold whose
 * effective status has already been computed. Keeps all status->UI mapping out
 * of JSX (TRD 5.4).
 */
export function holdActionsFor(status: HoldStatus): HoldActions {
  switch (status) {
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
        confirmLabel: messages.status.CONFIRMED,
        cancelLabel: messages.status.CONFIRMED,
        notice: messages.holds.confirmedNotice,
      }
    case "EXPIRED":
      return {
        canConfirm: false,
        canCancel: false,
        showCountdown: false,
        showApplyAgainHint: true,
        confirmLabel: messages.status.EXPIRED,
        cancelLabel: messages.status.EXPIRED,
        notice: `${messages.holds.expiredNotice} ${messages.holds.applyAgain}`,
      }
    case "CANCELLED":
      return {
        canConfirm: false,
        canCancel: false,
        showCountdown: false,
        showApplyAgainHint: true,
        confirmLabel: messages.status.CANCELLED,
        cancelLabel: messages.status.CANCELLED,
        notice: `${messages.holds.cancelledNotice} ${messages.holds.applyAgain}`,
      }
  }
}
