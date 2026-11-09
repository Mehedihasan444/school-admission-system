import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { ClassGrid } from "@/features/classes/components/ClassGrid"
import type { ClassSummary } from "@/features/classes/model/types"
import { messages } from "@/shared/i18n/messages.bn"

const { listClassesMock } = vi.hoisted(() => ({ listClassesMock: vi.fn() }))

vi.mock("@/features/classes/api/classesApi", () => ({
  listClasses: listClassesMock,
}))

function renderGrid(
  props: Partial<Parameters<typeof ClassGrid>[0]> = {}
): void {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })

  render(
    <QueryClientProvider client={queryClient}>
      <ClassGrid
        studentId="20152691234567890"
        applyingClassId={null}
        onApply={() => undefined}
        allHolds={[]}
        {...props}
      />
    </QueryClientProvider>
  )
}

const classSummary: ClassSummary = {
  id: "c-1",
  name: "Class 6 - Morning Shift",
  totalSeats: 40,
  heldSeats: 10,
  confirmedSeats: 5,
  availableSeats: 25,
}

describe("ClassGrid", () => {
  beforeEach(() => {
    listClassesMock.mockClear()
  })

  it("shows loading skeletons", () => {
    listClassesMock.mockResolvedValueOnce([])
    renderGrid()
    expect(screen.getByText(messages.classes.loading)).toBeInTheDocument()
  })

  it("shows empty message when no classes", async () => {
    listClassesMock.mockResolvedValueOnce([])
    renderGrid()
    await screen.findByText(messages.classes.empty)
  })

  it("renders class cards with seat counts", async () => {
    listClassesMock.mockResolvedValueOnce([classSummary])
    renderGrid()
    await screen.findByText("Class 6 - Morning Shift")
    expect(screen.getByText("২৫")).toBeInTheDocument() // availableSeats Bangla
  })

  it("shows retry button on error", async () => {
    listClassesMock.mockRejectedValueOnce(new Error("fail"))
    renderGrid()
    await screen.findByText(messages.retry)
  })
})
