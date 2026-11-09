export const STUDENT_ID_STORAGE_KEY = "admission.studentId"

export const STUDENT_ID_PATTERN = /^\d{17}$/

export function isValidStudentId(value: string): boolean {
  return STUDENT_ID_PATTERN.test(value.trim())
}

export function normalizeStudentId(value: string): string {
  return value.trim()
}
