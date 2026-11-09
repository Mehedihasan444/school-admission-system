import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { MyHoldsPanel } from "@/features/holds/components/MyHoldsPanel"
import type { MyHold } from "@/features/holds/model/types"
import type { useMyHolds } from "@/features/holds/hooks/useMyHolds"
import { messages } from "@/shared/i18n/messages.bn"

type UseMyHoldsResult = ReturnType<typeof useMyHolds>

const { useMyHoldsMock } = vi.hoisted(() => ({
  useMyHoldsMock: vi.fn(),
}))

vi.mock("@/features/holds/hooks/useMyHolds", () => ({
  useMyHolds: useMyHoldsMock,
}))

function renderPanel(holds: MyHold[] = [], error?: unknown): void {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })

  const mockResult = {
    data: holds,
    isLoading: false,
    isError: !!error,
    error: error as Error | null,
    isSuccess: !error,
    refetch: vi.fn(),
  } as unknown as UseMyHoldsResult

  useMyHoldsMock.mockReturnValue(mockResult)

  render(
    <QueryClientProvider client={queryClient}>
      <MyHoldsPanel studentId="20152691234567890" />
    </QueryClientProvider>
  )
}

const heldHold: MyHold = {
  holdId: "h-1",
  classId: "c-1",
  className: "Class 6 - Morning Shift",
  status: "HELD",
  expiresAt: "2027-01-02T00:00:00Z",
}

const confirmedHold: MyHold = {
  holdId: "h-2",
  classId: "c-2",
  className: "Class 6 - Day Shift",
  status: "CONFIRMED",
  expiresAt: "2027-01-03T00:00:00Z",
}

const expiredHold: MyHold = {
  holdId: "h-3",
  classId: "c-3",
  className: "Class 6 - Evening Shift",
  status: "EXPIRED",
  expiresAt: "2026-01-01T00:00:00Z",
}

describe("MyHoldsPanel", () => {
  beforeEach(() => {
    useMyHoldsMock.mockClear()
  })

  it("shows empty state when no holds", () => {
    renderPanel([])
    expect(screen.getByText(messages.holds.empty)).toBeInTheDocument()
  })

  it("shows HELD holds first", () => {
    renderPanel([expiredHold, heldHold, confirmedHold])
    const heldEl = screen.getByText("Class 6 - Morning Shift")
    const confirmedEl = screen.getByText("Class 6 - Day Shift")
    expect(heldEl).toBeInTheDocument()
    expect(confirmedEl).toBeInTheDocument()
    // HELD should appear before CONFIRMED in DOM
    const heldIndex = document.body.innerHTML.indexOf("Class 6 - Morning Shift")
    const confirmedIndex = document.body.innerHTML.indexOf(
      "Class 6 - Day Shift"
    )
    expect(heldIndex).toBeLessThan(confirmedIndex)
  })

  it("shows error state with retry button", () => {
    renderPanel([], new Error("fail"))
    expect(screen.getByText(messages.retry)).toBeInTheDocument()
  })

  it("prompts for student id when studentId is null", () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    render(
      <QueryClientProvider client={queryClient}>
        <MyHoldsPanel studentId={null} />
      </QueryClientProvider>
    )
    expect(screen.getByText(messages.classes.needStudentId)).toBeInTheDocument()
  })
})
