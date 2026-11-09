import { AlertCircle } from "lucide-react"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { toMessage } from "@/shared/i18n/errorMessages"
import { messages } from "@/shared/i18n/messages.bn"

interface InlineErrorProps {
  error?: unknown
  message?: string
  onDismiss?: () => void
}

/**
 * One consistent inline error surface for every feature. Accepts either a raw
 * error (mapped through the Bangla error table) or a ready message.
 */
export function InlineError({ error, message, onDismiss }: InlineErrorProps) {
  const text = message ?? (error ? toMessage(error) : null)
  if (!text) {
    return null
  }

  return (
    <Alert variant="destructive" aria-live="assertive">
      <AlertCircle aria-hidden="true" />
      <AlertDescription>{text}</AlertDescription>
      {onDismiss ? (
        <button
          type="button"
          onClick={onDismiss}
          className="ml-auto inline-flex items-center rounded-md text-xs text-muted-foreground hover:text-destructive focus:outline-none"
          aria-label={messages.errors.dismiss}
        >
          {messages.errors.dismiss}
        </button>
      ) : null}
    </Alert>
  )
}
