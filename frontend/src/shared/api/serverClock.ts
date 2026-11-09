let offsetMs = 0

/**
 * Browsers can have a skewed clock. Every API response carries a `Date` header,
 * so we keep the difference between server time and local time and use it for
 * the hold countdown. This is an approximation; the server stays authoritative
 * because the UI reconciles with polling.
 */
export function observeServerDate(response: Response): void {
  const header = response.headers.get("date")
  if (!header) {
    return
  }

  const serverNow = Date.parse(header)
  if (!Number.isNaN(serverNow)) {
    offsetMs = serverNow - Date.now()
  }
}

export function getServerNow(): number {
  return Date.now() + offsetMs
}

export function getServerOffsetMs(): number {
  return offsetMs
}

export function resetServerClock(): void {
  offsetMs = 0
}
