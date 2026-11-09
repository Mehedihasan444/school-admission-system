import { api } from "@/shared/api/httpClient"
import type { Hold, MyHold } from "@/features/holds/model/types"

export function applyHold(classId: string, studentId: string): Promise<Hold> {
  return api<Hold>(`/classes/${classId}/holds`, {
    method: "POST",
    studentId,
  })
}

export function getHold(holdId: string): Promise<Hold> {
  return api<Hold>(`/holds/${holdId}`)
}

export function confirmHold(holdId: string, studentId: string): Promise<void> {
  return api<void>(`/holds/${holdId}/confirm`, {
    method: "POST",
    studentId,
  })
}

export function cancelHold(holdId: string, studentId: string): Promise<void> {
  return api<void>(`/holds/${holdId}`, {
    method: "DELETE",
    studentId,
  })
}

export function listMyHolds(studentId: string): Promise<MyHold[]> {
  return api<MyHold[]>("/me/holds", { studentId })
}
