import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { HoldCard } from "@/features/holds/components/HoldCard"
import { useMyHolds } from "@/features/holds/hooks/useMyHolds"
import type { MyHold } from "@/features/holds/model/types"
import { InlineError } from "@/shared/components/InlineError"
import { messages } from "@/shared/i18n/messages.bn"
import { useState } from "react"

export interface MyHoldsPanelProps {
  studentId: string | null
}

const MAX_VISIBLE_INACTIVE = 5

function sortHolds(holds: MyHold[]): MyHold[] {
  const active = holds
    .filter((h) => h.status === "HELD" || h.status === "CONFIRMED")
    .sort((a, b) => {
      const aTime = Date.parse(a.expiresAt)
      const bTime = Date.parse(b.expiresAt)
      // HELD first (soonest expiry), then CONFIRMED
      if (a.status === "HELD" && b.status === "CONFIRMED") return -1
      if (a.status === "CONFIRMED" && b.status === "HELD") return 1
      return aTime - bTime
    })
  const inactive = holds
    .filter((h) => h.status === "EXPIRED" || h.status === "CANCELLED")
    .sort((a, b) => Date.parse(b.expiresAt) - Date.parse(a.expiresAt))
  return [...active, ...inactive]
}

function LoadingHolds() {
  return (
    <div className="flex flex-col gap-3" aria-busy="true">
      <Skeleton className="h-40 w-full" />
      <span className="sr-only">{messages.holds.loading}</span>
    </div>
  )
}

export function MyHoldsPanel({ studentId }: MyHoldsPanelProps) {
  const holdsQuery = useMyHolds(studentId)
  const [showMore, setShowMore] = useState(false)

  if (studentId === null) {
    return null
  }

  if (holdsQuery.isLoading) {
    return <LoadingHolds />
  }

  if (holdsQuery.isError) {
    return (
      <div className="flex flex-col items-start gap-3">
        <InlineError error={holdsQuery.error} />
        <Button variant="outline" onClick={() => void holdsQuery.refetch()}>
          {messages.retry}
        </Button>
      </div>
    )
  }

  const holds = holdsQuery.data ?? []
  const sorted = sortHolds(holds)
  const activeHolds = sorted.filter(
    (h) => h.status === "HELD" || h.status === "CONFIRMED"
  )
  const inactiveHolds = sorted.filter(
    (h) => h.status === "EXPIRED" || h.status === "CANCELLED"
  )

  if (holds.length === 0) {
    return (
      <div className="rounded-xl bg-muted px-6 py-8 text-center">
        <p className="text-sm text-muted-foreground">{messages.holds.empty}</p>
        <p className="mt-2 text-xs text-muted-foreground">
          {messages.classes.needStudentId}
        </p>
      </div>
    )
  }

  const visibleInactive = showMore
    ? inactiveHolds
    : inactiveHolds.slice(0, MAX_VISIBLE_INACTIVE)

  return (
    <section className="flex flex-col gap-4" aria-labelledby="holds-heading">
      <div className="flex flex-row items-center justify-between">
        <h2 id="holds-heading" className="text-lg font-semibold">
          {messages.holds.heading}
        </h2>
        {inactiveHolds.length > MAX_VISIBLE_INACTIVE && !showMore ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowMore(true)}
          >
            {messages.holds.showMore}
          </Button>
        ) : null}
      </div>

      {activeHolds.map((hold) => (
        <HoldCard key={hold.holdId} hold={hold} studentId={studentId} />
      ))}
      {visibleInactive.map((hold) => (
        <HoldCard key={hold.holdId} hold={hold} studentId={studentId} />
      ))}
      {inactiveHolds.length > MAX_VISIBLE_INACTIVE && showMore && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setShowMore(false)}
        >
          {messages.holds.showLess}
        </Button>
      )}
    </section>
  )
}
