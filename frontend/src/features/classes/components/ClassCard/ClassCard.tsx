import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import type { ClassSummary } from "@/features/classes/model/types"
import { messages } from "@/shared/i18n/messages.bn"

interface ClassCardProps {
  classSummary: ClassSummary
  canApply: boolean
  isApplying: boolean
  onApply: (classId: string) => void
}

interface CountProps {
  label: string
  value: number
}

function Count({ label, value }: CountProps) {
  return (
    <div className="flex flex-col">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-lg font-semibold tabular-nums">{value}</span>
    </div>
  )
}

export function ClassCard({
  classSummary,
  canApply,
  isApplying,
  onApply,
}: ClassCardProps) {
  const hasSeats = classSummary.availableSeats > 0
  const disabled = !canApply || !hasSeats || isApplying

  return (
    <Card>
      <CardHeader>
        <CardTitle>{classSummary.name}</CardTitle>
      </CardHeader>
      <CardContent>
        <div
          className="grid grid-cols-2 gap-4 sm:grid-cols-4"
          aria-live="polite"
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
      </CardContent>
      <CardFooter className="flex-col items-stretch gap-2 border-t pt-(--card-spacing)">
        <Button disabled={disabled} onClick={() => onApply(classSummary.id)}>
          {isApplying ? messages.classes.applying : messages.classes.apply}
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
