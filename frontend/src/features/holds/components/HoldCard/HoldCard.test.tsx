import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { HoldCard } from "@/features/holds/components/HoldCard"
import type { MyHold } from "@/features/holds/model/types"
import { messages } from "@/shared/i18n/messages.bn"

function renderCard(hold: MyHold): void {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })

  render(
    <QueryClientProvider client={queryClient}>
      <HoldCard hold={hold} studentId="20152691234567890" />
    </QueryClientProvider>
  )
}

const HOLD: MyHold = {
  holdId: "h-1",
  classId: "c-1",
  className: "Class 6 - Morning Shift",
  status: "HELD",
  expiresAt: "2026-01-01T00:00:03Z",
}

describe("HoldCard", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("shows HELD with an enabled pay button before expiry", () => {
    renderCard(HOLD)

    expect(screen.getByText(messages.status.HELD)).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: messages.holds.pay })
    ).toBeEnabled()
  })

  it("flips to EXPIRED and removes action buttons when the countdown reaches zero", () => {
    renderCard(HOLD)

    act(() => {
      vi.advanceTimersByTime(4000)
    })

    expect(screen.getByText(messages.status.EXPIRED)).toBeInTheDocument()
    expect(
      screen.queryByRole("button", { name: messages.holds.pay })
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole("button", { name: messages.holds.cancel })
    ).not.toBeInTheDocument()
    expect(screen.getAllByText("—").length).toBeGreaterThanOrEqual(1)
  })
})
