import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { HoldCard } from "@/features/holds/components/HoldCard"
import { useMyHolds } from "@/features/holds/hooks/useMyHolds"
import { InlineError } from "@/shared/components/InlineError"
import { messages } from "@/shared/i18n/messages.bn"

interface MyHoldsListProps {
  studentId: string | null
}

function LoadingHolds() {
  return (
    <div className="flex flex-col gap-3" aria-busy="true">
      <Skeleton className="h-40 w-full" />
      <span className="sr-only">{messages.holds.loading}</span>
    </div>
  )
}

export function MyHoldsList({ studentId }: MyHoldsListProps) {
  const holdsQuery = useMyHolds(studentId)

  return (
    <section className="flex flex-col gap-4" aria-labelledby="holds-heading">
      <h2 id="holds-heading" className="text-xl font-semibold">
        {messages.holds.heading}
      </h2>

      {studentId === null ? (
        <p className="rounded-xl bg-muted px-4 py-6 text-center text-sm text-muted-foreground">
          {messages.classes.needStudentId}
        </p>
      ) : null}

      {studentId !== null && holdsQuery.isLoading ? <LoadingHolds /> : null}

      {studentId !== null && holdsQuery.isError ? (
        <div className="flex flex-col items-start gap-3">
          <InlineError error={holdsQuery.error} />
          <Button variant="outline" onClick={() => void holdsQuery.refetch()}>
            {messages.retry}
          </Button>
        </div>
      ) : null}

      {studentId !== null &&
      holdsQuery.isSuccess &&
      holdsQuery.data.length === 0 ? (
        <p className="rounded-xl bg-muted px-4 py-6 text-center text-sm text-muted-foreground">
          {messages.holds.empty}
        </p>
      ) : null}

      {studentId !== null &&
      holdsQuery.isSuccess &&
      holdsQuery.data.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2">
          {holdsQuery.data.map((hold) => (
            <HoldCard key={hold.holdId} hold={hold} studentId={studentId} />
          ))}
        </div>
      ) : null}
    </section>
  )
}
