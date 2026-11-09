import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { InlineError } from "@/shared/components/InlineError"
import type { ClassSummary } from "@/features/classes/model/types"
import type { HoldStatus } from "@/features/holds"
import { messages } from "@/shared/i18n/messages.bn"

interface ClassCardProps {
  classSummary: ClassSummary
  canApply: boolean
  isApplying: boolean
  applicationStatus: HoldStatus | null
  applyError: string | null
  onDismissError: () => void
  onApply: (classId: string) => void
}

interface CountProps {
  label: string
  value: number
}

function Count({ label, value }: CountProps) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-md bg-muted/50 p-2">
      <span className="text-[10px] tracking-wider text-muted-foreground uppercase">
        {label}
      </span>
      <span className="text-lg font-semibold tabular-nums">{value}</span>
    </div>
  )
}

function applyButtonLabel(
  canApply: boolean,
  hasSeats: boolean,
  applicationStatus: HoldStatus | null
): string {
  if (!canApply) {
    return messages.classes.apply
  }
  if (!hasSeats) {
    return messages.classes.apply
  }
  if (applicationStatus === "HELD") {
    return messages.classes.applied
  }
  if (applicationStatus === "CONFIRMED") {
    return messages.classes.confirmed
  }
  return messages.classes.apply
}

export function ClassCard({
  classSummary,
  canApply,
  isApplying,
  applicationStatus,
  applyError,
  onDismissError,
  onApply,
}: ClassCardProps) {
  const hasSeats = classSummary.availableSeats > 0
  const alreadyApplied =
    applicationStatus === "HELD" || applicationStatus === "CONFIRMED"
  const disabled = !canApply || !hasSeats || isApplying || alreadyApplied

  return (
    <Card>
      <CardHeader>
        <CardTitle>{classSummary.name}</CardTitle>
      </CardHeader>
      <CardContent>
        <div
          className="grid grid-cols-2 gap-4 sm:grid-cols-4"
          aria-live="polite"
          aria-atomic="true"
        >
          <Count
            label={messages.classes.totalSeats}
            value={classSummary.totalSeats}
          />
          <Count
            label={messages.classes.heldSeats}
            value={classSummary.heldSeats}
          />
          <Count
            label={messages.classes.confirmedSeats}
            value={classSummary.confirmedSeats}
          />
          <Count
            label={messages.classes.availableSeats}
            value={classSummary.availableSeats}
          />
        </div>
        {applyError ? (
          <InlineError error={applyError} onDismiss={onDismissError} />
        ) : null}
      </CardContent>
      <CardFooter className="border-t pt-(--card-spacing)">
        <Button disabled={disabled} onClick={() => onApply(classSummary.id)}>
          {isApplying
            ? messages.classes.applying
            : applyButtonLabel(canApply, hasSeats, applicationStatus)}
        </Button>
        {!canApply ? (
          <p className="text-center text-xs text-muted-foreground">
            {messages.classes.needStudentId}
          </p>
        ) : null}
        {canApply && !hasSeats ? (
          <p className="text-center text-xs text-muted-foreground">
            {messages.classes.noSeats}
          </p>
        ) : null}
      </CardFooter>
    </Card>
  )
}
