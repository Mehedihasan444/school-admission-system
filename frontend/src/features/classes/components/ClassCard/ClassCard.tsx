import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import type { ClassSummary } from "@/features/classes/model/types"
import type { HoldStatus } from "@/features/holds"
import { formatNumberBn } from "@/shared/lib/format"
import { InlineError } from "@/shared/components/InlineError"
import { messages } from "@/shared/i18n/messages.bn"

interface ClassCardProps {
  classSummary: ClassSummary
  canApply: boolean
  isApplying: boolean
  applicationStatus: HoldStatus | null
  onApply: (classId: string) => void
  inlineError?: string | null
  onDismissError?: () => void
}

function availabilityBadge(
  availableSeats: number,
  totalSeats: number
): React.ReactNode {
  if (availableSeats === 0) {
    return <Badge variant="destructive">{messages.classes.noSeats}</Badge>
  }
  if (availableSeats <= totalSeats * 0.1) {
    return (
      <Badge
        variant="outline"
        style={{
          backgroundColor: "var(--warning-soft)",
          color: "var(--warning-foreground)",
          borderColor: "var(--warning)",
        }}
      >
        {messages.holds.expiredNotice}
      </Badge>
    )
  }
  return null
}

export function ClassCard({
  classSummary,
  canApply,
  isApplying,
  applicationStatus,
  onApply,
  inlineError,
  onDismissError,
}: ClassCardProps) {
  const occupied = classSummary.heldSeats + classSummary.confirmedSeats
  const progress =
    classSummary.totalSeats > 0 ? (occupied / classSummary.totalSeats) * 100 : 0
  const hasActiveApplication =
    applicationStatus === "HELD" || applicationStatus === "CONFIRMED"

  const buttonLabel = (() => {
    if (isApplying) return messages.classes.applying
    if (applicationStatus === "HELD") return messages.classes.applied
    if (applicationStatus === "CONFIRMED") return messages.classes.confirmed
    if (classSummary.availableSeats === 0) return messages.classes.noSeats
    return messages.classes.apply
  })()

  const buttonDisabled =
    !canApply ||
    isApplying ||
    hasActiveApplication ||
    classSummary.availableSeats === 0

  return (
    <Card
      className={`overflow-hidden border shadow-sm transition-shadow hover:shadow-md ${hasActiveApplication ? "border-primary/30 ring-1 ring-primary/30" : ""} `}
    >
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="flex items-center gap-2">
          <CardTitle
            className="max-w-[200px] truncate text-base"
            title={classSummary.name}
          >
            {classSummary.name}
          </CardTitle>
          {availabilityBadge(
            classSummary.availableSeats,
            classSummary.totalSeats
          )}
        </div>
        {hasActiveApplication && (
          <Badge
            variant={
              applicationStatus === "CONFIRMED" ? "default" : "secondary"
            }
          >
            {messages.status[applicationStatus]}
          </Badge>
        )}
      </CardHeader>

      <CardContent className="pt-0">
        <div className="flex flex-col gap-2">
          <div className="flex items-end gap-2">
            <span
              className="text-3xl font-bold tabular-nums"
              aria-live="polite"
            >
              {formatNumberBn(classSummary.availableSeats)}
            </span>
            <span className="text-sm text-muted-foreground">
              {messages.classes.availableSeats}
            </span>
            <span className="text-xs text-muted-foreground">
              মোট {formatNumberBn(classSummary.totalSeats)}
            </span>
          </div>
          <Progress value={progress} className="h-2" />
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: "var(--success)" }}
              />
              নিশ্চিত {formatNumberBn(classSummary.confirmedSeats)}
            </span>
            <span className="flex items-center gap-1">
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: "var(--warning)" }}
              />
              hold করা {formatNumberBn(classSummary.heldSeats)}
            </span>
          </div>
        </div>
      </CardContent>

      <CardFooter className="border-t pt-3">
        {inlineError ? (
          <InlineError error={inlineError} onDismiss={onDismissError} />
        ) : null}
        <Button
          type="button"
          disabled={buttonDisabled}
          onClick={() => onApply(classSummary.id)}
          className="w-full"
        >
          {buttonLabel}
        </Button>
      </CardFooter>
    </Card>
  )
}
