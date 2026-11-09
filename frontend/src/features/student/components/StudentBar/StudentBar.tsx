import { useState, type FormEvent } from "react"
import { CheckCircle2, UserRound, Pencil } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { isValidStudentId } from "@/features/student/model/studentId"
import { messages } from "@/shared/i18n/messages.bn"

interface StudentBarProps {
  studentId: string | null
  onSave: (value: string) => boolean
}

export function StudentBar({ studentId, onSave }: StudentBarProps) {
  const [draft, setDraft] = useState("")
  const [isEditing, setIsEditing] = useState(studentId === null)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!isValidStudentId(draft)) {
      setError(messages.student.invalid)
      return
    }
    if (onSave(draft)) {
      setError(null)
      setDraft("")
      setIsEditing(false)
    }
  }

  if (studentId && !isEditing) {
    return (
      <section
        className="flex w-full flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50/30 px-4 py-3 shadow-xs dark:border-emerald-900/60 dark:bg-emerald-950/20"
        aria-label={messages.student.heading}
      >
        <div className="flex items-center gap-3">
          <div className="flex size-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300">
            <CheckCircle2 className="size-4" aria-hidden="true" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-foreground">
              {messages.student.savedPrefix}
            </span>
            <span className="rounded-md border bg-background/80 px-2.5 py-0.5 font-mono text-sm font-semibold tracking-wider shadow-2xs">
              {studentId}
            </span>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsEditing(true)}
          className="h-8 gap-1.5 text-xs font-medium"
        >
          <Pencil className="size-3" />
          <span>{messages.student.changeButton}</span>
        </Button>
      </section>
    )
  }

  return (
    <section
      className="w-full rounded-xl border bg-card p-5 shadow-xs transition-shadow hover:shadow-sm"
      aria-label={messages.student.heading}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <UserRound className="size-4 text-primary" aria-hidden="true" />
          <h2 className="text-base font-semibold tracking-tight text-foreground">
            {messages.student.heading}
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="student-id" className="text-xs font-medium">
              {messages.student.label}
            </Label>
            <Input
              id="student-id"
              inputMode="numeric"
              autoComplete="off"
              placeholder={messages.student.placeholder}
              value={draft}
              aria-invalid={error !== null}
              aria-describedby={error ? "student-id-error" : undefined}
              className="h-9 font-mono tracking-wide"
              onChange={(event) => {
                setDraft(event.target.value)
                setError(null)
              }}
            />
          </div>
          <Button type="submit" className="h-9 px-5 font-medium">
            {messages.student.setButton}
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">{messages.student.hint}</p>

        {error ? (
          <p
            id="student-id-error"
            className="text-xs font-medium text-destructive"
            role="alert"
          >
            {error}
          </p>
        ) : null}
      </form>
    </section>
  )
}
