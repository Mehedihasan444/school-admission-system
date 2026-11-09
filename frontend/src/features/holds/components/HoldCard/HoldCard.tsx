import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { getHoldActions } from "@/features/holds"
import { useCancelHold } from "@/features/holds/hooks/useCancelHold"
import { useConfirmHold } from "@/features/holds/hooks/useConfirmHold"
import type { MyHold } from "@/features/holds/model/types"
import { cn } from "@/lib/utils"
import { messages } from "@/shared/i18n/messages.bn"
import { useCountdown } from "@/shared/hooks/useCountdown"
import { formatExpiryTime, formatRemaining } from "@/shared/lib/format"
import { CheckCircle2, Clock, AlertCircle, XCircle } from "lucide-react"

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
    <div
      className={cn(
        "flex flex-col rounded-xl border p-4 shadow-xs transition-all duration-200",
        effective === "CONFIRMED"
          ? "border-emerald-200 bg-emerald-50/20 dark:border-emerald-900/60 dark:bg-emerald-950/20"
          : effective === "HELD"
            ? "border-amber-200 bg-amber-50/20 ring-1 ring-amber-300/30 dark:border-amber-900/60 dark:bg-amber-950/20"
            : "border-border/60 bg-muted/20 opacity-85"
      )}
    >
      {/* Card Header */}
      <div className="flex items-start justify-between gap-2 pb-2">
        <h4 className="line-clamp-1 text-sm font-semibold text-foreground">
          {hold.className}
        </h4>
        <Badge
          variant="outline"
          className={cn(
            "shrink-0 px-2 py-0.5 text-xs font-medium",
            effective === "CONFIRMED"
              ? "border-emerald-300 bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
              : effective === "HELD"
                ? "animate-pulse border-amber-300 bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                : effective === "EXPIRED"
                  ? "border-border bg-muted text-muted-foreground"
                  : "border-border bg-muted text-muted-foreground"
          )}
        >
          {effective === "CONFIRMED" ? (
            <CheckCircle2 className="mr-1 inline size-3 text-emerald-600" />
          ) : effective === "HELD" ? (
            <Clock className="mr-1 inline size-3 text-amber-600" />
          ) : effective === "EXPIRED" ? (
            <AlertCircle className="mr-1 inline size-3 text-muted-foreground" />
          ) : (
            <XCircle className="mr-1 inline size-3 text-muted-foreground" />
          )}
          {messages.status[effective]}
        </Badge>
      </div>

      {/* Card Content */}
      <div className="py-1">
        {effective === "HELD" ? (
          <div className="flex flex-col gap-1.5">
            <div className="flex items-baseline gap-2">
              <span
                className="text-2xl font-bold tracking-tight text-amber-800 tabular-nums dark:text-amber-300"
                aria-live="polite"
              >
                {formatRemaining(remainingMs)}
              </span>
              <span className="text-xs font-medium text-muted-foreground">
                {messages.holds.timeRemaining}
              </span>
            </div>
            <span className="text-xs text-muted-foreground">
              শেষ হবে {formatExpiryTime(hold.expiresAt)}
            </span>
          </div>
        ) : effective === "CONFIRMED" ? (
          <div className="flex items-center gap-2 py-1 text-sm font-medium text-emerald-800 dark:text-emerald-300">
            <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
            <span>{messages.holds.confirmedNotice}</span>
          </div>
        ) : effective === "EXPIRED" ? (
          <div className="flex flex-col gap-0.5 py-1 text-xs text-muted-foreground">
            <span className="font-medium text-destructive/90">
              {messages.holds.expiredNotice}
            </span>
            <span>{messages.holds.applyAgain}</span>
          </div>
        ) : (
          <div className="py-1 text-xs text-muted-foreground">
            <span>{messages.holds.cancelledNotice}</span>
          </div>
        )}
      </div>

      {/* Card Actions (Only for HELD) */}
      {effective === "HELD" && (
        <div className="mt-3 flex flex-col gap-2 border-t border-amber-200/60 pt-3 dark:border-amber-900/60">
          <Button
            type="button"
            disabled={!actions.canConfirm || isBusy}
            variant="default"
            onClick={handleConfirm}
            className="w-full bg-emerald-600 font-medium text-white shadow-xs hover:bg-emerald-700"
          >
            {confirmMutation.isPending
              ? messages.holds.paying
              : messages.holds.pay}
          </Button>
          <Button
            type="button"
            disabled={!actions.canCancel || isBusy}
            variant="outline"
            size="sm"
            onClick={handleCancel}
            className="w-full text-muted-foreground hover:border-destructive/30 hover:text-destructive"
          >
            {cancelMutation.isPending
              ? messages.holds.cancelling
              : messages.holds.cancel}
          </Button>
        </div>
      )}
    </div>
  )
}
