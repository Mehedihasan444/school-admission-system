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
