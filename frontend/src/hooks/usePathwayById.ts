import { useQuery } from '@tanstack/react-query'

import type { DegreePathwayBase_PathwayCourse_ } from '../client/models/DegreePathwayBase_PathwayCourse_'
import { DefaultService } from '../client/services/DefaultService'

export const usePathwayById = (pathwayId: string | null) => {
  return useQuery<DegreePathwayBase_PathwayCourse_>({
    queryKey: ['pathway-detail', pathwayId],
    enabled: Boolean(pathwayId),
    queryFn: () => {
      if (!pathwayId) {
        throw new Error('Missing pathway id')
      }

      return DefaultService.getPathwayByIdPathwaysPathwayIdGet(pathwayId)
    },
  })
}
