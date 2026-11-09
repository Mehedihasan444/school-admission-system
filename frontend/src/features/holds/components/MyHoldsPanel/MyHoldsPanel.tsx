import { useState } from "react"
import { ClipboardList, AlertCircle, RefreshCw } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { HoldCard } from "@/features/holds/components/HoldCard"
import { useMyHolds } from "@/features/holds/hooks/useMyHolds"
import type { MyHold } from "@/features/holds/model/types"
import { InlineError } from "@/shared/components/InlineError"
import { messages } from "@/shared/i18n/messages.bn"

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
      {[0, 1].map((index) => (
        <div
          key={index}
          className="flex flex-col gap-2.5 rounded-xl border bg-card p-4 shadow-xs"
        >
          <div className="flex justify-between">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-16" />
          </div>
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-3 w-40" />
        </div>
      ))}
      <span className="sr-only">{messages.holds.loading}</span>
    </div>
  )
}

export function MyHoldsPanel({ studentId }: MyHoldsPanelProps) {
  const holdsQuery = useMyHolds(studentId)
  const [showMore, setShowMore] = useState(false)

  if (studentId === null) {
    return (
      <section className="flex flex-col gap-4" aria-labelledby="holds-heading">
        <div className="flex flex-row items-center justify-between">
          <h2
            id="holds-heading"
            className="text-lg font-semibold tracking-tight"
          >
            {messages.holds.heading}
          </h2>
        </div>
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed bg-muted/30 px-6 py-10 text-center">
          <AlertCircle className="size-6 text-muted-foreground/60" />
          <p className="text-sm font-medium text-muted-foreground">
            {messages.classes.needStudentId}
          </p>
        </div>
      </section>
    )
  }

  if (holdsQuery.isLoading) {
    return (
      <section className="flex flex-col gap-4" aria-labelledby="holds-heading">
        <h2 id="holds-heading" className="text-lg font-semibold tracking-tight">
          {messages.holds.heading}
        </h2>
        <LoadingHolds />
      </section>
    )
  }

  if (holdsQuery.isError) {
    return (
      <section className="flex flex-col gap-4" aria-labelledby="holds-heading">
        <h2 id="holds-heading" className="text-lg font-semibold tracking-tight">
          {messages.holds.heading}
        </h2>
        <div className="flex flex-col items-start gap-3 rounded-xl border border-destructive/20 bg-destructive/5 p-4">
          <InlineError error={holdsQuery.error} />
          <Button
            variant="outline"
            size="sm"
            onClick={() => void holdsQuery.refetch()}
          >
            {messages.retry}
          </Button>
        </div>
      </section>
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
      <section className="flex flex-col gap-4" aria-labelledby="holds-heading">
        <div className="flex flex-row items-center justify-between">
          <h2
            id="holds-heading"
            className="text-lg font-semibold tracking-tight"
          >
            {messages.holds.heading}
          </h2>
        </div>
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed bg-muted/30 px-6 py-10 text-center">
          <ClipboardList className="size-6 text-muted-foreground/60" />
          <p className="text-sm font-medium text-muted-foreground">
            {messages.holds.empty}
          </p>
        </div>
      </section>
    )
  }

  const visibleInactive = showMore
    ? inactiveHolds
    : inactiveHolds.slice(0, MAX_VISIBLE_INACTIVE)

  return (
    <section className="flex flex-col gap-4" aria-labelledby="holds-heading">
      <div className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <h2
            id="holds-heading"
            className="text-lg font-semibold tracking-tight"
          >
            {messages.holds.heading}
          </h2>
          {activeHolds.length > 0 && (
            <Badge
              variant="secondary"
              className="h-5 px-1.5 text-xs font-semibold"
            >
              {activeHolds.length}
            </Badge>
          )}
        </div>
        {holdsQuery.isFetching && !holdsQuery.isLoading && (
          <RefreshCw className="size-3 animate-spin text-muted-foreground" />
        )}
      </div>

      <div className="flex flex-col gap-3">
        {activeHolds.map((hold) => (
          <HoldCard key={hold.holdId} hold={hold} studentId={studentId} />
        ))}
        {visibleInactive.map((hold) => (
          <HoldCard key={hold.holdId} hold={hold} studentId={studentId} />
        ))}
      </div>

      {inactiveHolds.length > MAX_VISIBLE_INACTIVE && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setShowMore(!showMore)}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          {showMore ? messages.holds.showLess : messages.holds.showMore}
        </Button>
      )}
    </section>
  )
}
