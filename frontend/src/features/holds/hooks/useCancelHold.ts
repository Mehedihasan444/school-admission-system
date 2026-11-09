import { useMutation, useQueryClient } from "@tanstack/react-query"

import { cancelHold } from "@/features/holds/api/holdsApi"
import type { HoldActionInput } from "@/features/holds/model/types"
import { queryKeys } from "@/shared/api/queryKeys"

export function useCancelHold() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: HoldActionInput) =>
      cancelHold(input.holdId, input.studentId),
    onSuccess: (_result, input) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.classes })
      void queryClient.invalidateQueries({
        queryKey: queryKeys.myHolds(input.studentId),
      })
    },
  })
}
