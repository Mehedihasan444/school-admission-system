import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { ClassCard } from "@/features/classes/components/ClassCard"
import { useClasses } from "@/features/classes/hooks/useClasses"
import { getClassApplyState } from "@/features/holds"
import type { MyHold } from "@/features/holds"
import { InlineError } from "@/shared/components/InlineError"
import { messages } from "@/shared/i18n/messages.bn"
import { RefreshCw } from "lucide-react"

export interface ClassGridProps {
  studentId: string | null
  applyingClassId: string | null
  onApply: (classId: string) => void
  allHolds: MyHold[]
  inlineError?: string | null
}

function LoadingCards() {
  return (
    <div className="grid gap-4 sm:grid-cols-2" aria-busy="true">
      {[0, 1, 2, 3].map((index) => (
        <div
          key={index}
          className="flex flex-col gap-3 rounded-xl border bg-card p-5 shadow-xs"
        >
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-5 w-16" />
          </div>
          <div className="flex items-baseline gap-2">
            <Skeleton className="h-8 w-14" />
            <Skeleton className="h-4 w-20" />
          </div>
          <Skeleton className="h-2.5 w-full rounded-full" />
          <div className="flex justify-between">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-3 w-20" />
          </div>
          <Skeleton className="mt-2 h-9 w-full rounded-md" />
        </div>
      ))}
      <span className="sr-only">{messages.classes.loading}</span>
    </div>
  )
}

export function ClassGrid({
  studentId,
  applyingClassId,
  onApply,
  allHolds,
  inlineError,
}: ClassGridProps) {
  const classesQuery = useClasses()

  return (
    <section className="flex flex-col gap-4" aria-labelledby="classes-heading">
      <div className="flex flex-row items-center justify-between">
        <h2
          id="classes-heading"
          className="text-lg font-semibold tracking-tight"
        >
          {messages.classes.heading}
        </h2>
        {classesQuery.isFetching && !classesQuery.isLoading && (
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <RefreshCw className="size-3 animate-spin" />
            <span>আপডেট হচ্ছে...</span>
          </span>
        )}
      </div>

      {classesQuery.isLoading ? <LoadingCards /> : null}

      {classesQuery.isError ? (
        <div className="flex flex-col items-start gap-3 rounded-xl border border-destructive/20 bg-destructive/5 p-4">
          <InlineError error={classesQuery.error} />
          <Button
            variant="outline"
            size="sm"
            onClick={() => void classesQuery.refetch()}
          >
            {messages.retry}
          </Button>
        </div>
      ) : null}

      {classesQuery.isSuccess && classesQuery.data.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-muted/30 px-6 py-12 text-center">
          <p className="text-sm font-medium text-muted-foreground">
            {messages.classes.empty}
          </p>
        </div>
      ) : null}

      {classesQuery.isSuccess && classesQuery.data.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {classesQuery.data.map((classSummary) => {
            const applyState = getClassApplyState(classSummary.id, allHolds)
            const applicationStatus =
              applyState !== "CAN_APPLY" ? applyState : null

            return (
              <ClassCard
                key={classSummary.id}
                classSummary={classSummary}
                canApply={studentId !== null && applyState === "CAN_APPLY"}
                isApplying={applyingClassId === classSummary.id}
                applicationStatus={applicationStatus}
                onApply={onApply}
                inlineError={
                  inlineError && applyingClassId === classSummary.id
                    ? inlineError
                    : null
                }
              />
            )
          })}
        </div>
      ) : null}
    </section>
  )
}
