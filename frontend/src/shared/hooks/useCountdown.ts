import { useEffect, useState } from "react"

import { getServerNow } from "@/shared/api/serverClock"

interface Countdown {
  remainingMs: number
  isExpired: boolean
}

/**
 * Ticks once per second using server-corrected time. A hold that reaches zero
 * flips to EXPIRED in the UI immediately, before the next poll confirms it.
 */
export function useCountdown(expiresAt?: string): Countdown {
  const [now, setNow] = useState(() => getServerNow())

  useEffect(() => {
    const timer = window.setInterval(() => setNow(getServerNow()), 1000)
    return () => window.clearInterval(timer)
  }, [expiresAt])

  if (!expiresAt) {
    return { remainingMs: 0, isExpired: false }
  }

  const expiresMs = Date.parse(expiresAt)
  if (Number.isNaN(expiresMs)) {
    return { remainingMs: 0, isExpired: false }
  }

  const remainingMs = Math.max(0, expiresMs - now)
  return { remainingMs, isExpired: remainingMs === 0 }
}
