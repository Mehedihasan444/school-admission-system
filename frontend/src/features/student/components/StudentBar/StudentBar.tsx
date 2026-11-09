import { useState, type FormEvent } from "react"
import { BadgeCheck, UserRound } from "lucide-react"

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
        className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-card px-4 py-3 ring-1 ring-foreground/10 w-full"
        aria-label={messages.student.heading}
      >
        <div className="flex items-center gap-2">
          <BadgeCheck className="size-5 text-primary" aria-hidden="true" />
          <span className="font-medium">{messages.student.savedPrefix}</span>
          <span className="font-mono tracking-wide">{studentId}</span>
        </div>
        <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
          {messages.student.changeButton}
        </Button>
      </section>
    )
  }

  return (
    <section
      className="rounded-xl bg-card p-4 ring-1 ring-foreground/10 w-full"
      aria-label={messages.student.heading}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <UserRound className="size-5" aria-hidden="true" />
          <h2 className="font-medium">{messages.student.heading}</h2>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <div className="flex flex-1 flex-col gap-1.5">
            <Label htmlFor="student-id">{messages.student.label}</Label>
            <Input
              id="student-id"
              inputMode="numeric"
              autoComplete="off"
              placeholder={messages.student.placeholder}
              value={draft}
              aria-invalid={error !== null}
              aria-describedby={error ? "student-id-error" : undefined}
              onChange={(event) => {
                setDraft(event.target.value)
                setError(null)
              }}
            />
          </div>
          <Button type="submit">{messages.student.setButton}</Button>
        </div>

        <p className="text-xs text-muted-foreground">{messages.student.hint}</p>

        {error ? (
          <p
            id="student-id-error"
            className="text-sm text-destructive"
            role="alert"
          >
            {error}
          </p>
        ) : null}
      </form>
    </section>
  )
}
