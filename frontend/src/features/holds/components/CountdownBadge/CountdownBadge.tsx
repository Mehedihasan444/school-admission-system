import { Badge } from "@/components/ui/badge"
import type { HoldStatus } from "@/features/holds/model/types"
import { useCountdown } from "@/shared/hooks/useCountdown"
import { messages } from "@/shared/i18n/messages.bn"
import { formatExpiryTime, formatRemaining } from "@/shared/lib/format"

interface CountdownBadgeProps {
  status: HoldStatus
  expiresAt: string
}

export function CountdownBadge({ status, expiresAt }: CountdownBadgeProps) {
  const { remainingMs, isExpired } = useCountdown(expiresAt)

  const showExpiry = status === "HELD" || status === "EXPIRED"

  if (!showExpiry) {
    return null
  }

  return (
    <>
      {!isExpired ? (
        <Badge variant="secondary" aria-live="polite">
          {messages.holds.timeRemaining}: {formatRemaining(remainingMs)}
        </Badge>
      ) : null}
      <span className="text-xs text-muted-foreground">
        {messages.holds.expiresAt}: {formatExpiryTime(expiresAt)}
      </span>
    </>
  )
}
