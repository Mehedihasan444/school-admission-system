import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { ClassList } from "@/features/classes/components/ClassList"
import type { ClassSummary } from "@/features/classes/model/types"
import type { MyHold } from "@/features/holds"
import { messages } from "@/shared/i18n/messages.bn"

const { listClassesMock } = vi.hoisted(() => ({ listClassesMock: vi.fn() }))

vi.mock("@/features/classes/api/classesApi", () => ({
  listClasses: listClassesMock,
}))

function renderList(
  props: Partial<Parameters<typeof ClassList>[0]> = {}
): void {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })

  render(
    <QueryClientProvider client={queryClient}>
      <ClassList
        studentId="20152691234567890"
        applyingClassId={null}
        onApply={() => undefined}
        myHolds={[]}
        applyErrorByClassId={{}}
        onDismissApplyError={() => undefined}
        {...props}
      />
    </QueryClientProvider>
  )
}

function classSummary(overrides: Partial<ClassSummary> = {}): ClassSummary {
  return {
    id: "c-1",
    name: "Class 6 - Morning Shift",
    totalSeats: 10,
    heldSeats: 2,
    confirmedSeats: 3,
    availableSeats: 5,
    ...overrides,
  }
}

const hold = (overrides: Partial<MyHold> = {}): MyHold => ({
  holdId: "h-1",
  classId: "c-1",
  className: "Class 6 - Morning Shift",
  status: "HELD",
  expiresAt: "2026-01-01T00:00:00Z",
  ...overrides,
})

describe("ClassList", () => {
  beforeEach(() => {
    listClassesMock.mockReset()
  })

  it("renders the four seat counts from the API", async () => {
    listClassesMock.mockResolvedValue([classSummary()])
    renderList()

    expect(
      await screen.findByText("Class 6 - Morning Shift")
    ).toBeInTheDocument()
    expect(screen.getByText("10")).toBeInTheDocument()
    expect(screen.getByText("2")).toBeInTheDocument()
    expect(screen.getByText("3")).toBeInTheDocument()
    expect(screen.getByText("5")).toBeInTheDocument()
  })

  it("disables Apply when the class is full", async () => {
    listClassesMock.mockResolvedValue([
      classSummary({ availableSeats: 0, heldSeats: 10 }),
    ])
    renderList()

    const apply = await screen.findByRole("button", {
      name: messages.classes.apply,
    })
    expect(apply).toBeDisabled()
  })

  it("disables Apply when no student id is set", async () => {
    listClassesMock.mockResolvedValue([classSummary()])
    renderList({ studentId: null })

    const apply = await screen.findByRole("button", {
      name: messages.classes.apply,
    })
    expect(apply).toBeDisabled()
    expect(screen.getByText(messages.classes.needStudentId)).toBeInTheDocument()
  })

  it("disables Apply with 'আবেদন করা হয়েছে' when student has a HELD hold", async () => {
    listClassesMock.mockResolvedValue([classSummary()])
    renderList({ myHolds: [hold({ classId: "c-1", status: "HELD" })] })

    const apply = await screen.findByRole("button", {
      name: messages.classes.applied,
    })
    expect(apply).toBeDisabled()
  })

  it("disables Apply with 'ভর্তি নিশ্চিত' when student has a CONFIRMED hold", async () => {
    listClassesMock.mockResolvedValue([classSummary()])
    renderList({ myHolds: [hold({ classId: "c-1", status: "CONFIRMED" })] })

    const apply = await screen.findByRole("button", {
      name: messages.classes.confirmed,
    })
    expect(apply).toBeDisabled()
  })
})
