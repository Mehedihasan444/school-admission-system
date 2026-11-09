import { useMutation, useQueryClient } from "@tanstack/react-query"

import { createClass } from "@/features/classes/api/classesApi"
import type { CreateClassInput } from "@/features/classes/model/types"
import { queryKeys } from "@/shared/api/queryKeys"

export function useCreateClass() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: CreateClassInput) => createClass(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.classes })
    },
  })
}
