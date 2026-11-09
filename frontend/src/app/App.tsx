import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ClassGrid } from "@/features/classes/components/ClassGrid"
import { CreateClassForm } from "@/features/classes/components/CreateClassForm"
import { MyHoldsPanel } from "@/features/holds/components/MyHoldsPanel"
import { useApplyHold, useMyHolds } from "@/features/holds"
import { StudentBar, useStudentId } from "@/features/student"
import { messages } from "@/shared/i18n/messages.bn"
import { useCallback, useState } from "react"

export function App() {
  const { studentId, saveStudentId } = useStudentId()
  const applyMutation = useApplyHold()
  const myHoldsQuery = useMyHolds(studentId)
  const [activeTab, setActiveTab] = useState("classes")

  const activeHoldCount =
    myHoldsQuery.data?.filter(
      (h) => h.status === "HELD" || h.status === "CONFIRMED"
    ).length ?? 0

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
    <div className="mx-auto flex min-h-svh w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6">
      <header className="flex flex-row items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight">
            {messages.appTitle}
          </h1>
          <p className="text-sm text-muted-foreground">
            {messages.appSubtitle}
          </p>
        </div>
      </header>
      <div className="flex w-full items-center gap-2">
        <StudentBar studentId={studentId} onSave={saveStudentId} />
      </div>

      <CreateClassForm />

      {/* Mobile: tabs; Desktop: grid + sidebar */}
      <div className="lg:hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="classes" className="w-full">
              {messages.classes.heading}
            </TabsTrigger>
            <TabsTrigger value="holds" className="w-full">
              {messages.holds.heading}
              {activeHoldCount > 0 && (
                <span className="ml-1 h-2 w-2 rounded-full bg-warning"></span>
              )}
            </TabsTrigger>
          </TabsList>
          <TabsContent value="classes" className="mt-4">
            <ClassGrid
              studentId={studentId}
              applyingClassId={applyingClassId}
              onApply={handleApply}
              allHolds={myHoldsQuery.data ?? []}
            />
          </TabsContent>
          <TabsContent value="holds" className="mt-4">
            <MyHoldsPanel studentId={studentId} />
          </TabsContent>
        </Tabs>
      </div>

      <div className="hidden gap-6 lg:flex lg:flex-row">
        <div className="min-w-0 flex-1">
          <ClassGrid
            studentId={studentId}
            applyingClassId={applyingClassId}
            onApply={handleApply}
            allHolds={myHoldsQuery.data ?? []}
          />
        </div>
        <div className="shrink-0 lg:sticky lg:top-6 lg:w-[420px]">
          <MyHoldsPanel studentId={studentId} />
        </div>
      </div>
    </div>
  )
}

export default App
