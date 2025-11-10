import { useMutation } from '@tanstack/react-query'

import { DefaultService } from '../client/services/DefaultService'
import type { CompleteDegreePathway_Output } from '../client/models/CompleteDegreePathway_Output'

type PredictByIdInput = {
  pathwayId: string
  message: string
}

export const usePredictDegreePathwayById = () => {
  return useMutation<CompleteDegreePathway_Output, Error, PredictByIdInput>({
    mutationKey: ['predict-degree-pathway-by-id'],
    mutationFn: async ({ pathwayId, message }) => {
      const trimmed = message.trim()

      if (!trimmed) {
        throw new Error('Please enter a question before submitting.')
      }

      return await DefaultService.predictDegreePathwayByIdPredictPathwayIdPost(
        pathwayId,
        JSON.stringify(trimmed),
      )
    },
  })
}
