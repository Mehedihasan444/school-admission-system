import { useCallback, useState } from "react"
import { GraduationCap } from "lucide-react"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ClassGrid } from "@/features/classes/components/ClassGrid"
import { CreateClassForm } from "@/features/classes/components/CreateClassForm"
import { MyHoldsPanel } from "@/features/holds/components/MyHoldsPanel"
import { useApplyHold, useMyHolds } from "@/features/holds"
import { StudentBar, useStudentId } from "@/features/student"
import { messages } from "@/shared/i18n/messages.bn"

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
    <div className="mx-auto flex min-h-svh w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6">
      {/* App Header */}
      <header className="flex flex-col gap-1 border-b pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3.5">
          <div className="flex size-11 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
            <GraduationCap className="size-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              {messages.appTitle}
            </h1>
            <p className="text-xs text-muted-foreground sm:text-sm">
              {messages.appSubtitle}
            </p>
          </div>
        </div>
      </header>

      {/* Student Identity Bar */}
      <StudentBar studentId={studentId} onSave={saveStudentId} />

      {/* Create Class Form (Admin) */}
      <CreateClassForm />

      {/* Mobile: Tabs */}
      <div className="lg:hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="classes" className="w-full">
              {messages.classes.heading}
            </TabsTrigger>
            <TabsTrigger value="holds" className="relative w-full">
              {messages.holds.heading}
              {activeHoldCount > 0 && (
                <span className="ml-1.5 flex size-2 rounded-full bg-amber-500" />
              )}
            </TabsTrigger>
          </TabsList>
          <TabsContent value="classes" className="mt-5">
            <ClassGrid
              studentId={studentId}
              applyingClassId={applyingClassId}
              onApply={handleApply}
              allHolds={myHoldsQuery.data ?? []}
            />
          </TabsContent>
          <TabsContent value="holds" className="mt-5">
            <MyHoldsPanel studentId={studentId} />
          </TabsContent>
        </Tabs>
      </div>

      {/* Desktop: Class Grid + Sticky Applications Sidebar */}
      <div className="hidden gap-8 lg:flex lg:flex-row lg:items-start">
        <div className="min-w-0 flex-1">
          <ClassGrid
            studentId={studentId}
            applyingClassId={applyingClassId}
            onApply={handleApply}
            allHolds={myHoldsQuery.data ?? []}
          />
        </div>
        <div className="shrink-0 lg:sticky lg:top-6 lg:w-[380px] xl:w-[400px]">
          <MyHoldsPanel studentId={studentId} />
        </div>
      </div>
    </div>
  )
}

export default App
