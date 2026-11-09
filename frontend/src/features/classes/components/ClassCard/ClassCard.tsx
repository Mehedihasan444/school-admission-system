import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { ClassSummary } from "@/features/classes/model/types"
import type { HoldStatus } from "@/features/holds"
import { cn } from "@/lib/utils"
import { InlineError } from "@/shared/components/InlineError"
import { messages } from "@/shared/i18n/messages.bn"
import { formatNumberBn } from "@/shared/lib/format"
import { CheckCircle2, Clock, Users } from "lucide-react"

interface ClassCardProps {
  classSummary: ClassSummary
  canApply: boolean
  isApplying: boolean
  applicationStatus: HoldStatus | null
  onApply: (classId: string) => void
  inlineError?: string | null
  onDismissError?: () => void
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
  const hasActiveApplication =
    applicationStatus === "HELD" || applicationStatus === "CONFIRMED"

  const confirmedPct =
    classSummary.totalSeats > 0
      ? (classSummary.confirmedSeats / classSummary.totalSeats) * 100
      : 0
  const heldPct =
    classSummary.totalSeats > 0
      ? (classSummary.heldSeats / classSummary.totalSeats) * 100
      : 0

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
    <div
      className={cn(
        "group flex flex-col justify-between rounded-xl border bg-card p-5 shadow-xs transition-all duration-200 hover:shadow-md",
        hasActiveApplication && applicationStatus === "CONFIRMED"
          ? "border-emerald-300 ring-1 ring-emerald-300/40 dark:border-emerald-800"
          : hasActiveApplication && applicationStatus === "HELD"
            ? "border-amber-300 ring-1 ring-amber-300/40 dark:border-amber-800"
            : "hover:border-foreground/20"
      )}
    >
      <div className="flex flex-col gap-4">
        {/* Card Header: Class name and status badge */}
        <div className="flex items-start justify-between gap-3">
          <h3
            className="line-clamp-1 text-base font-semibold tracking-tight text-foreground"
            title={classSummary.name}
          >
            {classSummary.name}
          </h3>

          {hasActiveApplication ? (
            <Badge
              variant="outline"
              className={cn(
                "shrink-0 px-2.5 py-0.5 text-xs font-medium",
                applicationStatus === "CONFIRMED"
                  ? "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                  : "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
              )}
            >
              {applicationStatus === "CONFIRMED" ? (
                <CheckCircle2 className="mr-1 inline size-3.5 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <Clock className="mr-1 inline size-3.5 text-amber-600 dark:text-amber-400" />
              )}
              {messages.status[applicationStatus]}
            </Badge>
          ) : classSummary.availableSeats === 0 ? (
            <Badge
              variant="outline"
              className="shrink-0 border-destructive/30 bg-destructive/10 px-2 py-0.5 text-xs text-destructive"
            >
              {messages.classes.noSeats}
            </Badge>
          ) : null}
        </div>

        {/* Seat Metric Highlight */}
        <div className="flex items-baseline justify-between">
          <div className="flex items-baseline gap-2">
            <span
              className="text-3xl font-extrabold tracking-tight text-foreground tabular-nums"
              aria-live="polite"
            >
              {formatNumberBn(classSummary.availableSeats)}
            </span>
            <span className="text-xs font-medium text-muted-foreground">
              {messages.classes.availableSeats}
            </span>
          </div>
          <div className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
            <Users className="size-3.5 text-muted-foreground/70" />
            <span>মোট {formatNumberBn(classSummary.totalSeats)}</span>
          </div>
        </div>

        {/* Segmented Capacity Progress Bar */}
        <div className="flex flex-col gap-2">
          <div
            className="flex h-2.5 w-full overflow-hidden rounded-full bg-muted/80 ring-1 ring-foreground/5"
            role="progressbar"
            aria-valuenow={classSummary.confirmedSeats + classSummary.heldSeats}
            aria-valuemin={0}
            aria-valuemax={classSummary.totalSeats}
          >
            {confirmedPct > 0 && (
              <div
                className="h-full bg-emerald-500 transition-all duration-300"
                style={{ width: `${confirmedPct}%` }}
                title={`নিশ্চিত: ${classSummary.confirmedSeats}`}
              />
            )}
            {heldPct > 0 && (
              <div
                className="h-full bg-amber-400 transition-all duration-300"
                style={{ width: `${heldPct}%` }}
                title={`hold করা: ${classSummary.heldSeats}`}
              />
            )}
          </div>

          {/* Seat breakdown legend */}
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-block size-2 rounded-full bg-emerald-500" />
              নিশ্চিত {formatNumberBn(classSummary.confirmedSeats)}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-block size-2 rounded-full bg-amber-400" />
              hold করা {formatNumberBn(classSummary.heldSeats)}
            </span>
          </div>
        </div>
      </div>

      {/* Card Action */}
      <div className="mt-4 flex flex-col gap-2 border-t pt-3">
        {inlineError ? (
          <InlineError error={inlineError} onDismiss={onDismissError} />
        ) : null}
        <Button
          type="button"
          disabled={buttonDisabled}
          onClick={() => onApply(classSummary.id)}
          className={cn(
            "w-full font-medium transition-all",
            hasActiveApplication && applicationStatus === "CONFIRMED"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
              : hasActiveApplication && applicationStatus === "HELD"
                ? "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
                : ""
          )}
          variant={
            hasActiveApplication
              ? "outline"
              : classSummary.availableSeats === 0
                ? "secondary"
                : "default"
          }
        >
          {buttonLabel}
        </Button>
      </div>
    </div>
  )
}
