import { skipToken, useQuery } from "@tanstack/react-query"

import { listMyHolds } from "@/features/holds/api/holdsApi"
import { queryKeys } from "@/shared/api/queryKeys"

export const MY_HOLDS_POLL_INTERVAL_MS = 3000

export function useMyHolds(studentId: string | null) {
  return useQuery({
    queryKey: queryKeys.myHolds(studentId),
    queryFn: studentId ? () => listMyHolds(studentId) : skipToken,
    refetchInterval: MY_HOLDS_POLL_INTERVAL_MS,
    refetchIntervalInBackground: false,
  })
}
