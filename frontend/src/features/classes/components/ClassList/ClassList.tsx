import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { ClassCard } from "@/features/classes/components/ClassCard"
import { useClasses } from "@/features/classes/hooks/useClasses"
import { InlineError } from "@/shared/components/InlineError"
import type { MyHold } from "@/features/holds/model/types"
import { messages } from "@/shared/i18n/messages.bn"

interface ClassListProps {
  studentId: string | null
  applyingClassId: string | null
  onApply: (classId: string) => void
  myHolds: MyHold[]
  applyErrorByClassId: Record<string, string>
  onDismissApplyError: (classId: string) => void
}

function LoadingCards() {
  return (
    <div className="grid gap-4 md:grid-cols-2" aria-busy="true">
      {[0, 1].map((index) => (
        <div
          key={index}
          className="flex flex-col gap-3 rounded-xl p-4 ring-1 ring-foreground/10"
        >
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-9 w-full" />
        </div>
      ))}
      <span className="sr-only">{messages.classes.loading}</span>
    </div>
  )
}

export function ClassList({
  studentId,
  applyingClassId,
  onApply,
  myHolds,
  applyErrorByClassId,
  onDismissApplyError,
}: ClassListProps) {
  const classesQuery = useClasses()

  const holdsByClassId = new Map(
    myHolds.map((hold) => [hold.classId, hold.status])
  )

  return (
    <section className="flex flex-col gap-4" aria-labelledby="classes-heading">
      <h2 id="classes-heading" className="text-xl font-semibold">
        {messages.classes.heading}
      </h2>

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
        <p className="rounded-xl bg-muted px-4 py-6 text-center text-sm text-muted-foreground">
          {messages.classes.empty}
        </p>
      ) : null}

      {classesQuery.isSuccess && classesQuery.data.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2">
          {classesQuery.data.map((classSummary) => {
            const applicationStatus = holdsByClassId.get(classSummary.id) ?? null
            const applyError = applyErrorByClassId[classSummary.id] ?? null
            return (
              <ClassCard
                key={classSummary.id}
                classSummary={classSummary}
                canApply={studentId !== null}
                isApplying={applyingClassId === classSummary.id}
                applicationStatus={applicationStatus}
                applyError={applyError}
                onDismissError={() => onDismissApplyError(classSummary.id)}
                onApply={onApply}
              />
            )
          })}
        </div>
      ) : null}
    </section>
  )
}
