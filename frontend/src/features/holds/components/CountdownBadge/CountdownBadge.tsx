import { Badge } from "@/components/ui/badge"
import { HoldStatusBadge } from "@/features/holds/components/HoldStatusBadge"
import type { HoldStatus } from "@/features/holds/model/types"
import { useCountdown } from "@/shared/hooks/useCountdown"
import { messages } from "@/shared/i18n/messages.bn"
import { formatRemaining } from "@/shared/lib/format"

interface CountdownBadgeProps {
  status: HoldStatus
  expiresAt: string
}

export function CountdownBadge({ status, expiresAt }: CountdownBadgeProps) {
  const { remainingMs, isExpired } = useCountdown(expiresAt)

  if (status !== "HELD") {
    return <HoldStatusBadge status={status} />
  }

  if (isExpired) {
    return <HoldStatusBadge status="EXPIRED" />
  }

  return (
    <Badge variant="secondary" aria-live="polite">
      {messages.holds.timeRemaining}: {formatRemaining(remainingMs)}
    </Badge>
  )
}
