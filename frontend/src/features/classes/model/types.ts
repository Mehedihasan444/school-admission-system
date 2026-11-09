export interface ClassSummary {
  id: string
  name: string
  totalSeats: number
  heldSeats: number
  confirmedSeats: number
  availableSeats: number
}

export interface CreateClassInput {
  name: string
  totalSeats: number
}
