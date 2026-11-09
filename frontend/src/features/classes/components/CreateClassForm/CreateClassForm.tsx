import { useState, type FormEvent } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useCreateClass } from "@/features/classes/hooks/useCreateClass"
import { InlineError } from "@/shared/components/InlineError"
import { messages } from "@/shared/i18n/messages.bn"
import { CheckCircle2, PlusCircle } from "lucide-react"

const MIN_SEATS = 1
const MAX_SEATS = 100_000

interface FormErrors {
  name?: string
  seats?: string
}

function validate(name: string, seats: string): FormErrors {
  const errors: FormErrors = {}
  if (name.trim().length === 0) {
    errors.name = messages.createClass.nameRequired
  }
  const parsed = Number.parseInt(seats, 10)
  if (!/^\d+$/.test(seats) || parsed < MIN_SEATS || parsed > MAX_SEATS) {
    errors.seats = messages.createClass.seatsInvalid
  }
  return errors
}

export function CreateClassForm() {
  const [name, setName] = useState("")
  const [seats, setSeats] = useState("")
  const [errors, setErrors] = useState<FormErrors>({})
  const [isSaved, setIsSaved] = useState(false)
  const mutation = useCreateClass()

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const nextErrors = validate(name, seats)
    setErrors(nextErrors)
    setIsSaved(false)
    if (Object.keys(nextErrors).length > 0) {
      return
    }

    mutation.mutate(
      { name: name.trim(), totalSeats: Number.parseInt(seats, 10) },
      {
        onSuccess: () => {
          setName("")
          setSeats("")
          setIsSaved(true)
        },
      }
    )
  }

  return (
    <div className="rounded-xl border bg-card p-5 shadow-xs transition-shadow hover:shadow-sm">
      <div className="flex flex-col gap-1 border-b pb-4">
        <div className="flex items-center gap-2">
          <PlusCircle className="size-4 text-primary" />
          <h2 className="text-base font-semibold tracking-tight text-foreground">
            {messages.createClass.heading}
          </h2>
        </div>
        <p className="text-xs text-muted-foreground">
          {messages.createClass.description}
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="mt-4 flex flex-col gap-4"
        noValidate
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_160px_auto] sm:items-end">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="class-name" className="text-xs font-medium">
              {messages.createClass.nameLabel}
            </Label>
            <Input
              id="class-name"
              value={name}
              placeholder={messages.createClass.namePlaceholder}
              aria-invalid={Boolean(errors.name)}
              className="h-9"
              onChange={(event) => {
                setName(event.target.value)
                setErrors((current) => ({ ...current, name: undefined }))
                setIsSaved(false)
              }}
            />
            {errors.name ? (
              <p className="text-xs text-destructive" role="alert">
                {errors.name}
              </p>
            ) : null}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="class-seats" className="text-xs font-medium">
              {messages.createClass.seatsLabel}
            </Label>
            <Input
              id="class-seats"
              inputMode="numeric"
              value={seats}
              placeholder={messages.createClass.seatsPlaceholder}
              aria-invalid={Boolean(errors.seats)}
              className="h-9"
              onChange={(event) => {
                setSeats(event.target.value)
                setErrors((current) => ({ ...current, seats: undefined }))
                setIsSaved(false)
              }}
            />
            {errors.seats ? (
              <p className="text-xs text-destructive" role="alert">
                {errors.seats}
              </p>
            ) : null}
          </div>

          <Button
            type="submit"
            disabled={mutation.isPending}
            className="h-9 px-4 font-medium"
          >
            {mutation.isPending
              ? messages.createClass.submitting
              : messages.createClass.submit}
          </Button>
        </div>

        {mutation.error ? <InlineError error={mutation.error} /> : null}

        {isSaved ? (
          <div
            className="flex items-center gap-1.5 text-xs font-medium text-emerald-600"
            role="status"
          >
            <CheckCircle2 className="size-3.5" />
            <span>{messages.createClass.success}</span>
          </div>
        ) : null}
      </form>
    </div>
  )
}
