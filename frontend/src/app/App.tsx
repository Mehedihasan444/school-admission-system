import { ClassList, CreateClassForm } from "@/features/classes"
import { MyHoldsList, useApplyHold } from "@/features/holds"
import { StudentBar, useStudentId } from "@/features/student"
import { messages } from "@/shared/i18n/messages.bn"

export function App() {
  const { studentId, saveStudentId } = useStudentId()
  const applyMutation = useApplyHold()

  const applyingClassId = applyMutation.isPending
    ? (applyMutation.variables?.classId ?? null)
    : null

  const handleApply = (classId: string) => {
    if (!studentId) {
      return
    }
    applyMutation.mutate({ classId, studentId })
  }

  return (
    <div className="mx-auto flex min-h-svh w-full max-w-5xl flex-col gap-6 px-4 py-6 sm:px-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight">
          {messages.appTitle}
        </h1>
        <p className="text-sm text-muted-foreground">{messages.appSubtitle}</p>
      </header>

      <StudentBar studentId={studentId} onSave={saveStudentId} />

      <div className="grid gap-6 lg:grid-cols-[2fr_3fr]">
        <CreateClassForm />
        <ClassList
          studentId={studentId}
          applyingClassId={applyingClassId}
          applyError={applyMutation.error}
          onApply={handleApply}
        />
      </div>

      <MyHoldsList studentId={studentId} />
    </div>
  )
}

export default App
