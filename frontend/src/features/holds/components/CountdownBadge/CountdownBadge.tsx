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

  if (status !== "HELD" || isExpired) {
    return null
  }

  return (
    <>
      <Badge variant="secondary" aria-live="polite">
        {messages.holds.timeRemaining}: {formatRemaining(remainingMs)}
      </Badge>
      <span className="text-xs text-muted-foreground">
        {messages.holds.expiresAt}: {formatExpiryTime(expiresAt)}
      </span>
    </>
  )
}
