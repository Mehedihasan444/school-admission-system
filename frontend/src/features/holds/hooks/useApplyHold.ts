import { useMutation, useQueryClient } from "@tanstack/react-query"

import { applyHold } from "@/features/holds/api/holdsApi"
import type { ApplyHoldInput } from "@/features/holds/model/types"
import { queryKeys } from "@/shared/api/queryKeys"

export function useApplyHold() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: ApplyHoldInput) =>
      applyHold(input.classId, input.studentId),
    onSuccess: (_hold, input) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.classes })
      void queryClient.invalidateQueries({
        queryKey: queryKeys.myHolds(input.studentId),
      })
    },
  })
}
