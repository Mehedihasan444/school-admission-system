import { api } from "@/shared/api/httpClient"
import type {
  ClassSummary,
  CreateClassInput,
} from "@/features/classes/model/types"

interface CreateClassResponse {
  id: string
  name: string
  totalSeats: number
}

export function listClasses(): Promise<ClassSummary[]> {
  return api<ClassSummary[]>("/classes")
}

export function getClass(classId: string): Promise<ClassSummary> {
  return api<ClassSummary>(`/classes/${classId}`)
}

export function createClass(
  input: CreateClassInput
): Promise<CreateClassResponse> {
  return api<CreateClassResponse>("/classes", {
    method: "POST",
    body: JSON.stringify(input),
  })
}
