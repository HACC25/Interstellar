import { useMutation } from '@tanstack/react-query'

import type { Body_predict_degree_pathway_predict_post } from '../client/models/Body_predict_degree_pathway_predict_post'
import type { CompleteDegreePathway_Output } from '../client/models/CompleteDegreePathway_Output'
import { DefaultService } from '../client/services/DefaultService'

type PredictPayload =
  | string
  | {
      message: string
      files?: File[] | null
    }

export const usePredictDegreePathway = () => {
  return useMutation<CompleteDegreePathway_Output, Error, PredictPayload>({
    mutationKey: ['predict-degree-pathway'],
    mutationFn: async (input: PredictPayload) => {
      const payload = typeof input === 'string' ? { message: input } : input
      const trimmed = payload.message.trim()

      if (!trimmed) {
        throw new Error('Please enter a question before submitting.')
      }

      const formData: Body_predict_degree_pathway_predict_post = {
        query: trimmed,
      }

      if (payload.files && payload.files.length) {
        formData.files = payload.files
      }

      return await DefaultService.predictDegreePathwayPredictPost(formData)
    },
  })
}
