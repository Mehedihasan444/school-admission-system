import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { ClassCard } from "@/features/classes/components/ClassCard"
import { useClasses } from "@/features/classes/hooks/useClasses"
import { Table, TableBody, TableHead, TableHeader } from "@/components/ui/table"
import { InlineError } from "@/shared/components/InlineError"
import type { MyHold } from "@/features/holds"
import { messages } from "@/shared/i18n/messages.bn"

interface ClassListProps {
  studentId: string | null
  applyingClassId: string | null
  onApply: (classId: string) => void
  myHolds: MyHold[]
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
        <div className="rounded-xl bg-muted px-6 py-8 text-center">
          <p className="text-sm text-muted-foreground">
            {messages.classes.empty}
          </p>
        </div>
      ) : null}

      {classesQuery.isSuccess && classesQuery.data.length > 0 ? (
        <Table className="rounded-lg border border-border">
          <TableHeader>
            <TableHead className="text-left font-medium text-muted-foreground">
              {messages.classes.name}
            </TableHead>
            <TableHead className="text-right font-medium text-muted-foreground tabular-nums">
              {messages.classes.totalSeats}
            </TableHead>
            <TableHead className="text-right font-medium text-muted-foreground tabular-nums">
              {messages.classes.heldSeats}
            </TableHead>
            <TableHead className="text-right font-medium text-muted-foreground tabular-nums">
              {messages.classes.confirmedSeats}
            </TableHead>
            <TableHead className="text-right font-medium text-muted-foreground tabular-nums">
              {messages.classes.availableSeats}
            </TableHead>
            <TableHead className="text-left font-medium text-muted-foreground">
              {messages.classes.action}
            </TableHead>
          </TableHeader>
          <TableBody>
            {classesQuery.data.map((classSummary) => {
              const applicationStatus =
                holdsByClassId.get(classSummary.id) ?? null
              return (
                <ClassCard
                  key={classSummary.id}
                  classSummary={classSummary}
                  canApply={studentId !== null}
                  isApplying={applyingClassId === classSummary.id}
                  applicationStatus={applicationStatus}
                  onApply={onApply}
                />
              )
            })}
          </TableBody>
        </Table>
      ) : null}
    </section>
  )
}
