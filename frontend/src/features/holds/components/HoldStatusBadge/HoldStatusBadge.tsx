import { Badge } from "@/components/ui/badge"
import type { HoldStatus } from "@/features/holds/model/types"
import { messages } from "@/shared/i18n/messages.bn"

const VARIANT_BY_STATUS = {
  HELD: "secondary",
  CONFIRMED: "default",
  EXPIRED: "outline",
  CANCELLED: "destructive",
} as const

interface HoldStatusBadgeProps {
  status: HoldStatus
}

export function HoldStatusBadge({ status }: HoldStatusBadgeProps) {
  return (
    <Badge variant={VARIANT_BY_STATUS[status]} aria-live="polite">
      {messages.status[status]}
    </Badge>
  )
}
