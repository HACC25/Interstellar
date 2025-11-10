import { useMutation } from '@tanstack/react-query'

import { OpenAPI } from '../client/core/OpenAPI'
import type { CompleteDegreePathway_Input } from '../client/models/CompleteDegreePathway_Input'
import type { CompleteDegreePathway_Output } from '../client/models/CompleteDegreePathway_Output'

type ExportResult = {
  blob: Blob
  filename: string
}

const resolveExportUrl = () => {
  const base = OpenAPI.BASE?.trim() ?? ''

  if (!base) {
    return '/export'
  }

  return `${base.replace(/\/$/, '')}/export`
}

const extractFilename = (contentDisposition: string | null): string => {
  if (!contentDisposition) {
    return 'degree-pathway.pdf'
  }

  const match = /filename\*?=(?:UTF-8'')?"?([^\";]+)/i.exec(contentDisposition)
  return match?.[1] ?? 'degree-pathway.pdf'
}

export const useExportPathwayPdf = () => {
  return useMutation<ExportResult, Error, CompleteDegreePathway_Output>({
    mutationKey: ['export-degree-pathway'],
    mutationFn: async (plan) => {
      const response = await fetch(resolveExportUrl(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/pdf',
        },
        body: JSON.stringify(plan as CompleteDegreePathway_Input),
      })

      if (!response.ok) {
        throw new Error('Failed to export pathway plan.')
      }

      const blob = await response.blob()
      const filename = extractFilename(response.headers.get('content-disposition'))

      return { blob, filename }
    },
  })
}
