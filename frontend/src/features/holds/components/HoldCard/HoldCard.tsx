import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import type { MyHold } from "@/features/holds/model/types"
import { getHoldActions } from "@/features/holds"
import { useCancelHold } from "@/features/holds/hooks/useCancelHold"
import { useConfirmHold } from "@/features/holds/hooks/useConfirmHold"
import { useCountdown } from "@/shared/hooks/useCountdown"
import { formatRemaining, formatExpiryTime } from "@/shared/lib/format"
import { messages } from "@/shared/i18n/messages.bn"

interface HoldCardProps {
  hold: MyHold
  studentId: string
}

export function HoldCard({ hold, studentId }: HoldCardProps) {
  const { isExpired, remainingMs } = useCountdown(hold.expiresAt)
  const confirmMutation = useConfirmHold()
  const cancelMutation = useCancelHold()

  const effective: "HELD" | "CONFIRMED" | "EXPIRED" | "CANCELLED" =
    hold.status === "HELD" && isExpired ? "EXPIRED" : hold.status
  const actions = getHoldActions(effective)
  const isBusy = confirmMutation.isPending || cancelMutation.isPending

  const handleConfirm = () => {
    confirmMutation.mutate({ holdId: hold.holdId, studentId })
  }

  const handleCancel = () => {
    cancelMutation.mutate({ holdId: hold.holdId, studentId })
  }

  return (
    <Card className="overflow-hidden border shadow-sm">
      <CardHeader className="pb-2">
        <div className="flex flex-row items-center justify-between">
          <CardTitle className="truncate text-sm font-medium">
            {hold.className}
          </CardTitle>
          <Badge variant={effective === "CONFIRMED" ? "default" : "secondary"}>
            {messages.status[effective]}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="pt-0 pb-2">
        {effective === "HELD" ? (
          <div className="flex flex-col gap-2">
            <div className="flex items-baseline gap-2">
              <span
                className="text-2xl font-bold tabular-nums"
                aria-live="polite"
              >
                {formatRemaining(remainingMs)}
              </span>
              <span className="text-xs text-muted-foreground">
                {messages.holds.timeRemaining}
              </span>
            </div>
            <span className="text-xs text-muted-foreground">
              শেষ হবে {formatExpiryTime(hold.expiresAt)}
            </span>
          </div>
        ) : effective === "CONFIRMED" ? (
          <div className="flex items-center gap-2 text-sm">
            <span
              className="flex h-5 w-5 items-center justify-center rounded-full"
              style={{ backgroundColor: "var(--success)" }}
            >
              ✓
            </span>
            <span className="font-medium">
              {messages.holds.confirmedNotice}
            </span>
          </div>
        ) : effective === "EXPIRED" ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="text-xs">{messages.holds.expiredNotice}</span>
            <span className="text-xs">{messages.holds.applyAgain}</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="text-xs">{messages.holds.cancelledNotice}</span>
          </div>
        )}
      </CardContent>

      <CardFooter className="border-t pt-2">
        {effective === "HELD" ? (
          <div className="flex flex-col gap-2">
            <Button
              type="button"
              disabled={!actions.canConfirm || isBusy}
              variant="default"
              onClick={handleConfirm}
              className="w-full"
            >
              {confirmMutation.isPending
                ? messages.holds.paying
                : messages.holds.pay}
            </Button>
            <Button
              type="button"
              disabled={!actions.canCancel || isBusy}
              variant="outline"
              onClick={handleCancel}
              className="w-full"
            >
              {cancelMutation.isPending
                ? messages.holds.cancelling
                : messages.holds.cancel}
            </Button>
          </div>
        ) : null}
      </CardFooter>
    </Card>
  )
}
