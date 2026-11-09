import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { CountdownBadge } from "@/features/holds/components/CountdownBadge"
import { HoldStatusBadge } from "@/features/holds/components/HoldStatusBadge"
import { useCancelHold } from "@/features/holds/hooks/useCancelHold"
import { useConfirmHold } from "@/features/holds/hooks/useConfirmHold"
import type { HoldStatus, MyHold } from "@/features/holds/model/types"
import { InlineError } from "@/shared/components/InlineError"
import { useCountdown } from "@/shared/hooks/useCountdown"
import { messages } from "@/shared/i18n/messages.bn"
import { formatExpiresAt } from "@/shared/lib/format"

interface HoldCardProps {
  hold: MyHold
  studentId: string
}

export function HoldCard({ hold, studentId }: HoldCardProps) {
  const { isExpired } = useCountdown(hold.expiresAt)
  const confirmMutation = useConfirmHold()
  const cancelMutation = useCancelHold()

  const displayStatus: HoldStatus =
    hold.status === "HELD" && isExpired ? "EXPIRED" : hold.status
  const isBusy = confirmMutation.isPending || cancelMutation.isPending
  const canAct = displayStatus === "HELD"

  const handleConfirm = () => {
    confirmMutation.mutate({ holdId: hold.holdId, studentId })
  }

  const handleCancel = () => {
    cancelMutation.mutate({ holdId: hold.holdId, studentId })
  }

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>{hold.className}</CardTitle>
        <div className="flex flex-wrap items-center gap-2">
          <HoldStatusBadge status={displayStatus} />
          <CountdownBadge status={hold.status} expiresAt={hold.expiresAt} />
          <span className="text-xs text-muted-foreground">
            {formatExpiresAt(hold.expiresAt)}
          </span>
        </div>
      </CardHeader>

      <CardContent className="flex flex-col gap-2">
        <InlineError error={confirmMutation.error ?? cancelMutation.error} />
        {displayStatus === "CONFIRMED" ? (
          <p className="text-sm text-primary">
            {messages.holds.confirmedNotice}
          </p>
        ) : null}
        {displayStatus === "CANCELLED" ? (
          <p className="text-sm text-muted-foreground">
            {messages.holds.cancelledNotice}
          </p>
        ) : null}
      </CardContent>

      <CardFooter className="gap-2 border-t pt-(--card-spacing)">
        <Button disabled={!canAct || isBusy} onClick={handleConfirm}>
          {confirmMutation.isPending
            ? messages.holds.paying
            : messages.holds.pay}
        </Button>
        <Button
          variant="outline"
          disabled={!canAct || isBusy}
          onClick={handleCancel}
        >
          {cancelMutation.isPending
            ? messages.holds.cancelling
            : messages.holds.cancel}
        </Button>
      </CardFooter>
    </Card>
  )
}
