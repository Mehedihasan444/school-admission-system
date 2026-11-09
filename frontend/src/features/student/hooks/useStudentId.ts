import { useCallback, useState } from "react"

import {
  isValidStudentId,
  normalizeStudentId,
  STUDENT_ID_STORAGE_KEY,
} from "@/features/student/model/studentId"

function readStoredStudentId(): string | null {
  try {
    const stored = window.localStorage.getItem(STUDENT_ID_STORAGE_KEY)
    return stored && isValidStudentId(stored) ? stored : null
  } catch {
    return null
  }
}

interface UseStudentIdResult {
  studentId: string | null
  saveStudentId: (value: string) => boolean
  clearStudentId: () => void
}

/**
 * Student identity lives in localStorage so a refresh or a closed tab keeps the
 * guardian's applications visible (PRD U4).
 */
export function useStudentId(): UseStudentIdResult {
  const [studentId, setStudentId] = useState<string | null>(() =>
    readStoredStudentId()
  )

  const saveStudentId = useCallback((value: string) => {
    const normalized = normalizeStudentId(value)
    if (!isValidStudentId(normalized)) {
      return false
    }

    try {
      window.localStorage.setItem(STUDENT_ID_STORAGE_KEY, normalized)
    } catch {
      // Private browsing can reject storage; keep the id for this session.
    }

    setStudentId(normalized)
    return true
  }, [])

  const clearStudentId = useCallback(() => {
    try {
      window.localStorage.removeItem(STUDENT_ID_STORAGE_KEY)
    } catch {
      // Ignore storage failures; clearing the in-memory state is enough.
    }
    setStudentId(null)
  }, [])

  return { studentId, saveStudentId, clearStudentId }
}
