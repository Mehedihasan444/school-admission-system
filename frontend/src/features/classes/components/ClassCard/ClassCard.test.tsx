import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { ClassCard } from "@/features/classes/components/ClassCard"
import type { ClassSummary } from "@/features/classes/model/types"
import type { HoldStatus } from "@/features/holds"
import { messages } from "@/shared/i18n/messages.bn"

const classSummary: ClassSummary = {
  id: "c-1",
  name: "Class 6 - Morning Shift",
  totalSeats: 40,
  heldSeats: 10,
  confirmedSeats: 5,
  availableSeats: 25,
}

function renderCard(
  props: Partial<Parameters<typeof ClassCard>[0]> = {}
): void {
  render(
    <ClassCard
      classSummary={classSummary}
      canApply={true}
      isApplying={false}
      applicationStatus={null}
      onApply={() => undefined}
      {...props}
    />
  )
}

describe("ClassCard", () => {
  it("shows apply button when CAN_APPLY with seats", () => {
    renderCard({ applicationStatus: null })
    expect(
      screen.getByRole("button", { name: messages.classes.apply })
    ).toBeEnabled()
  })

  it("shows disabled seat নেই when no seats available", () => {
    renderCard({
      applicationStatus: null,
      classSummary: { ...classSummary, availableSeats: 0 },
    })
    const btn = screen.getByRole("button", { name: messages.classes.noSeats })
    expect(btn).toBeDisabled()
  })

  it("shows disabled আবেদন করা হয়েছে when HELD", () => {
    renderCard({ applicationStatus: "HELD" as HoldStatus })
    const btn = screen.getByRole("button", {
      name: messages.classes.applied,
    })
    expect(btn).toBeDisabled()
  })

  it("shows disabled ভর্তি নিশ্চিত when CONFIRMED", () => {
    renderCard({ applicationStatus: "CONFIRMED" as HoldStatus })
    const btn = screen.getByRole("button", {
      name: messages.classes.confirmed,
    })
    expect(btn).toBeDisabled()
  })

  it("shows class name and seat counts", () => {
    renderCard()
    expect(screen.getByText("Class 6 - Morning Shift")).toBeInTheDocument()
    // Bangla digit formatting should be applied
    expect(document.body.innerHTML).toContain("৪")
    expect(document.body.innerHTML).toContain("২")
  })

  it("shows পূর্ণ badge when available is 0", () => {
    renderCard({
      classSummary: { ...classSummary, availableSeats: 0 },
    })
    const noSeatsTexts = screen.getAllByText(messages.classes.noSeats)
    expect(noSeatsTexts.length).toBeGreaterThanOrEqual(1)
  })

  it("disables button when canApply is false", () => {
    renderCard({ canApply: false })
    expect(
      screen.getByRole("button", { name: messages.classes.apply })
    ).toBeDisabled()
  })
})
