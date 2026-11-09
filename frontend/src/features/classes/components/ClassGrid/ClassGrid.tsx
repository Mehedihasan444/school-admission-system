import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { ClassCard } from "@/features/classes/components/ClassCard"
import { useClasses } from "@/features/classes/hooks/useClasses"
import { getClassApplyState } from "@/features/holds"
import type { MyHold } from "@/features/holds"
import { InlineError } from "@/shared/components/InlineError"
import { messages } from "@/shared/i18n/messages.bn"

export interface ClassGridProps {
  studentId: string | null
  applyingClassId: string | null
  onApply: (classId: string) => void
  allHolds: MyHold[]
  inlineError?: string | null
}

function LoadingCards() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3" aria-busy="true">
      {[0, 1, 2].map((index) => (
        <div
          key={index}
          className="flex flex-col gap-3 rounded-xl bg-muted/50 p-4 ring-1 ring-foreground/10"
        >
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-8 w-full" />
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
        <h2 id="classes-heading" className="text-lg font-semibold">
          {messages.classes.heading}
        </h2>
      </div>

      {classesQuery.isLoading ? <LoadingCards /> : null}

      {classesQuery.isError ? (
        <div className="flex flex-col items-start gap-3">
          <InlineError error={classesQuery.error} />
          <Button variant="outline" onClick={() => void classesQuery.refetch()}>
            {messages.retry}
          </Button>
        </div>
      ) : null}

      {classesQuery.isSuccess && classesQuery.data.length === 0 ? (
        <div className="rounded-xl bg-muted px-6 py-8 text-center">
          <p className="text-sm text-muted-foreground">
            {messages.classes.empty}
          </p>
        </div>
      ) : null}

      {classesQuery.isSuccess && classesQuery.data.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
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
