export const queryKeys = {
  classes: ["classes"] as const,
  myHolds: (studentId: string | null) => ["my-holds", studentId] as const,
}
