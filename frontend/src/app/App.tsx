import { ClassList, CreateClassForm } from "@/features/classes"
import { MyHoldsList, useApplyHold, useMyHolds } from "@/features/holds"
import { StudentBar, useStudentId } from "@/features/student"
import { messages } from "@/shared/i18n/messages.bn"
import { useCallback } from "react"

export function App() {
  const { studentId, saveStudentId } = useStudentId()
  const applyMutation = useApplyHold()
  const myHoldsQuery = useMyHolds(studentId)

  const handleApply = useCallback(
    (classId: string) => {
      if (!studentId) {
        return
      }
      applyMutation.mutate({ classId, studentId })
    },
    [studentId, applyMutation]
  )

  const applyingClassId = applyMutation.isPending
    ? (applyMutation.variables?.classId ?? null)
    : null

  return (
    <div className="mx-auto flex min-h-svh w-full max-w-5xl flex-col gap-6 px-4 py-6 sm:px-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight">
          {messages.appTitle}
        </h1>
        <p className="text-sm text-muted-foreground">{messages.appSubtitle}</p>
      </header>

      <StudentBar studentId={studentId} onSave={saveStudentId} />

      <div className="grid gap-6 lg:grid-cols-2">
        <CreateClassForm />
        <ClassList
          studentId={studentId}
          applyingClassId={applyingClassId}
          onApply={handleApply}
          myHolds={myHoldsQuery.data ?? []}
        />
      </div>

      <MyHoldsList studentId={studentId} />
    </div>
  )
}

export default App
