const BANGLA_DIGITS = "০১২৩৪৫৬৭৮৯"
const LATIN_DIGITS = "0123456789"

const banglaToLatin = new Map<string, string>()
const latinToBangla = new Map<string, string>()

for (let i = 0; i < 10; i++) {
  banglaToLatin.set(BANGLA_DIGITS[i], LATIN_DIGITS[i])
  latinToBangla.set(LATIN_DIGITS[i], BANGLA_DIGITS[i])
}

/**
 * Normalize Bangla digits (০-৯) to Latin digits (0-9).
 * Used before validation and before sending to the API.
 */
export function normalizeBanglaDigits(input: string): string {
  return input.replace(/[০-৯]/g, (d) => banglaToLatin.get(d) ?? d)
}

/**
 * Format a number with Bangla digits via Intl bn-BD.
 */
export function formatNumberBn(value: number): string {
  return new Intl.NumberFormat("bn-BD").format(value)
}

/**
 * Format a countdown in mm:ss with Bangla digits.
 */
export function formatRemaining(remainingMs: number): string {
  const totalSeconds = Math.max(0, Math.ceil(remainingMs / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${formatNumberBn(minutes)}:${formatNumberBn(seconds).padStart(2, "০")}`
}

/**
 * Format a time using Intl DateTimeFormat bn-BD with Asia/Dhaka timezone.
 * Shows date + time when not today; only time when today.
 */
export function formatExpiryTime(expiresAt: string): string {
  const date = new Date(expiresAt)
  if (Number.isNaN(date.getTime())) {
    return expiresAt
  }

  const now = new Date()
  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear()

  const options: Intl.DateTimeFormatOptions = {
    timeZone: "Asia/Dhaka",
    hour: "2-digit",
    minute: "2-digit",
  }

  if (!isToday) {
    options.day = "2-digit"
    options.month = "2-digit"
  }

  return new Intl.DateTimeFormat("bn-BD", options).format(date)
}
