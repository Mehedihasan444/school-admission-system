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
import { effectiveStatus, holdActionsFor } from "@/features/holds/model/types"
import { InlineError } from "@/shared/components/InlineError"
import { toMessage } from "@/shared/i18n/errorMessages"
import { messages } from "@/shared/i18n/messages.bn"
import { useState } from "react"

interface HoldCardProps {
  hold: MyHold
  studentId: string
}

export function HoldCard({ hold, studentId }: HoldCardProps) {
  const confirmMutation = useConfirmHold()
  const cancelMutation = useCancelHold()
  const [holdError, setHoldError] = useState<string | null>(null)

  const displayStatus: HoldStatus = effectiveStatus(
    hold.status,
    hold.expiresAt,
    Date.now()
  )
  const actions = holdActionsFor(displayStatus)
  const isBusy = confirmMutation.isPending || cancelMutation.isPending

  const handleConfirm = () => {
    setHoldError(null)
    confirmMutation.mutate({ holdId: hold.holdId, studentId }, {
      onError: (error) => {
        setHoldError(toMessage(error))
      },
    })
  }

  const handleCancel = () => {
    setHoldError(null)
    cancelMutation.mutate({ holdId: hold.holdId, studentId }, {
      onError: (error) => {
        setHoldError(toMessage(error))
      },
    })
  }

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>{hold.className}</CardTitle>
        <div className="flex flex-wrap items-center gap-2">
          <HoldStatusBadge status={displayStatus} />
          <CountdownBadge status={hold.status} expiresAt={hold.expiresAt} />
        </div>
      </CardHeader>

      <CardContent className="flex flex-col gap-2">
        <InlineError
          error={holdError}
          onDismiss={() => setHoldError(null)}
        />
        {actions.notice ? (
          <p className="text-sm text-primary">{actions.notice}</p>
        ) : null}
      </CardContent>

      <CardFooter className="gap-2 border-t pt-(--card-spacing)">
        {actions.canConfirm ? (
          <Button
            disabled={!actions.canConfirm || isBusy}
            onClick={handleConfirm}
          >
            {confirmMutation.isPending
              ? messages.holds.paying
              : actions.confirmLabel}
          </Button>
        ) : null}
        {actions.canCancel ? (
          <Button
            variant="outline"
            disabled={!actions.canCancel || isBusy}
            onClick={handleCancel}
          >
            {cancelMutation.isPending
              ? messages.holds.cancelling
              : messages.holds.cancel}
          </Button>
        ) : null}
      </CardFooter>
    </Card>
  )
}
