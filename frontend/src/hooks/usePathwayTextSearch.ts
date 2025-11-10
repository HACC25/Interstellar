import { useQuery } from '@tanstack/react-query'

import type { DegreePathwayBase_PathwayCourse_ } from '../client/models/DegreePathwayBase_PathwayCourse_'
import { DefaultService } from '../client/services/DefaultService'

type Options = {
  enabled?: boolean
  limit?: number
}

export const usePathwayTextSearch = (
  query: string,
  { enabled = false, limit = 8 }: Options = {},
) => {
  return useQuery<DegreePathwayBase_PathwayCourse_[]>({
    queryKey: ['pathway-text-search', query, limit],
    enabled: enabled && Boolean(query),
    queryFn: () => DefaultService.pathwayTextSearchPathwaysTextSearchGet(query, limit),
  })
}
