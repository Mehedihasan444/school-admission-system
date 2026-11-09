import { useState, type FormEvent } from "react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useCreateClass } from "@/features/classes/hooks/useCreateClass"
import { InlineError } from "@/shared/components/InlineError"
import { messages } from "@/shared/i18n/messages.bn"

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
    <Card>
      <CardHeader>
        <CardTitle>{messages.createClass.heading}</CardTitle>
        <CardDescription>{messages.createClass.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={handleSubmit}
          className="flex flex-wrap justify-around gap-4"
          noValidate
        >
          <div className="flex flex-1 flex-col gap-1.5">
            <Label htmlFor="class-name">{messages.createClass.nameLabel}</Label>
            <Input
              id="class-name"
              value={name}
              placeholder={messages.createClass.namePlaceholder}
              aria-invalid={Boolean(errors.name)}
              onChange={(event) => {
                setName(event.target.value)
                setErrors((current) => ({ ...current, name: undefined }))
                setIsSaved(false)
              }}
            />
            {errors.name ? (
              <p className="text-sm text-destructive" role="alert">
                {errors.name}
              </p>
            ) : null}
          </div>

          <div className="flex flex-1 flex-col gap-1.5">
            <Label htmlFor="class-seats">
              {messages.createClass.seatsLabel}
            </Label>
            <Input
              id="class-seats"
              inputMode="numeric"
              value={seats}
              placeholder={messages.createClass.seatsPlaceholder}
              aria-invalid={Boolean(errors.seats)}
              onChange={(event) => {
                setSeats(event.target.value)
                setErrors((current) => ({ ...current, seats: undefined }))
                setIsSaved(false)
              }}
            />
            {errors.seats ? (
              <p className="text-sm text-destructive" role="alert">
                {errors.seats}
              </p>
            ) : null}
          </div>

          <InlineError error={mutation.error} />

          {isSaved ? (
            <p className="text-sm text-primary" role="status">
              {messages.createClass.success}
            </p>
          ) : null}
          <div className="flex flex-col justify-end gap-1.5">
            <Button type="submit" disabled={mutation.isPending} className="">
              {mutation.isPending
                ? messages.createClass.submitting
                : messages.createClass.submit}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
