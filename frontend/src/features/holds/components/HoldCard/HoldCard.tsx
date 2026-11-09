import { Button } from "@/components/ui/button"
import { CountdownBadge } from "@/features/holds/components/CountdownBadge"
import { HoldStatusBadge } from "@/features/holds/components/HoldStatusBadge"
import { useCancelHold } from "@/features/holds/hooks/useCancelHold"
import { useConfirmHold } from "@/features/holds/hooks/useConfirmHold"
import { TableCell, TableRow } from "@/components/ui/table"
import type { MyHold } from "@/features/holds/model/types"
import { holdActionsFor } from "@/features/holds/model/types"
import { useCountdown } from "@/shared/hooks/useCountdown"
import { messages } from "@/shared/i18n/messages.bn"

interface HoldCardProps {
  hold: MyHold
  studentId: string
}

export function HoldCard({ hold, studentId }: HoldCardProps) {
  const { isExpired } = useCountdown(hold.expiresAt)
  const confirmMutation = useConfirmHold()
  const cancelMutation = useCancelHold()

  const displayStatus: "HELD" | "CONFIRMED" | "EXPIRED" | "CANCELLED" =
    hold.status === "HELD" && isExpired ? "EXPIRED" : hold.status
  const actions = holdActionsFor(displayStatus)
  const isBusy = confirmMutation.isPending || cancelMutation.isPending

  const handleConfirm = () => {
    confirmMutation.mutate({ holdId: hold.holdId, studentId })
  }

  const handleCancel = () => {
    cancelMutation.mutate({ holdId: hold.holdId, studentId })
  }

  return (
    <TableRow className="[&>td]:border-t-0">
      <TableCell className="text-left font-medium">{hold.className}</TableCell>
      <TableCell>
        <HoldStatusBadge status={displayStatus} />
      </TableCell>
      <TableCell>
        <CountdownBadge status={hold.status} expiresAt={hold.expiresAt} />
      </TableCell>
      <TableCell>
        <Button
          disabled={!actions.canConfirm || isBusy}
          variant={actions.canConfirm ? "default" : "outline"}
          onClick={handleConfirm}
          className="w-full sm:w-auto"
        >
          {confirmMutation.isPending
            ? messages.holds.paying
            : (actions.confirmLabel ?? messages.holds.pay)}
        </Button>
      </TableCell>
      <TableCell>
        <Button
          variant={actions.canCancel ? "outline" : "ghost"}
          disabled={!actions.canCancel || isBusy}
          onClick={handleCancel}
          className="w-full sm:w-auto"
        >
          {cancelMutation.isPending
            ? messages.holds.cancelling
            : (actions.cancelLabel ?? messages.holds.cancel)}
        </Button>
      </TableCell>
    </TableRow>
  )
}
