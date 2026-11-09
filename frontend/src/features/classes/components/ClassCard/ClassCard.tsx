import { Button } from "@/components/ui/button"
import { TableCell, TableRow } from "@/components/ui/table"
import type { ClassSummary } from "@/features/classes/model/types"
import type { HoldStatus } from "@/features/holds"
import { messages } from "@/shared/i18n/messages.bn"

interface ClassCardProps {
  classSummary: ClassSummary
  canApply: boolean
  isApplying: boolean
  applicationStatus: HoldStatus | null
  onApply: (classId: string) => void
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
  onApply,
}: ClassCardProps) {
  const hasSeats = classSummary.availableSeats > 0
  const alreadyApplied =
    applicationStatus === "HELD" || applicationStatus === "CONFIRMED"
  const disabled = !canApply || !hasSeats || isApplying || alreadyApplied

  return (
    <TableRow className="[&>td]:border-t-0">
      <TableCell className="text-left font-medium">
        {classSummary.name}
      </TableCell>
      <TableCell className="text-right tabular-nums">
        {classSummary.totalSeats}
      </TableCell>
      <TableCell className="text-right tabular-nums">
        {classSummary.heldSeats}
      </TableCell>
      <TableCell className="text-right tabular-nums">
        {classSummary.confirmedSeats}
      </TableCell>
      <TableCell className="text-right font-semibold tabular-nums">
        {classSummary.availableSeats}
      </TableCell>
      <TableCell>
        <Button
          disabled={disabled}
          onClick={() => onApply(classSummary.id)}
          className="w-full sm:w-auto"
        >
          {isApplying
            ? messages.classes.applying
            : applyButtonLabel(canApply, hasSeats, applicationStatus)}
        </Button>
      </TableCell>
    </TableRow>
  )
}
