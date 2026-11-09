import { AlertCircle } from "lucide-react"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { toMessage } from "@/shared/i18n/errorMessages"

interface InlineErrorProps {
  error?: unknown
  message?: string
}

/**
 * One consistent inline error surface for every feature. Accepts either a raw
 * error (mapped through the Bangla error table) or a ready message.
 */
export function InlineError({ error, message }: InlineErrorProps) {
  const text = message ?? (error ? toMessage(error) : null)
  if (!text) {
    return null
  }

  return (
    <Alert variant="destructive" aria-live="assertive">
      <AlertCircle aria-hidden="true" />
      <AlertDescription>{text}</AlertDescription>
    </Alert>
  )
}
