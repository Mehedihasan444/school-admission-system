import { useQuery } from "@tanstack/react-query"

import { listClasses } from "@/features/classes/api/classesApi"
import { queryKeys } from "@/shared/api/queryKeys"

export const CLASSES_POLL_INTERVAL_MS = 3000

export function useClasses() {
  return useQuery({
    queryKey: queryKeys.classes,
    queryFn: listClasses,
    refetchInterval: CLASSES_POLL_INTERVAL_MS,
    refetchIntervalInBackground: false,
  })
}
