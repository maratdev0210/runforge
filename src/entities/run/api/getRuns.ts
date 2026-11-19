import type { Run } from '../model/types'

let pendingRequest: Promise<Run[]> | undefined

export function getRuns(): Promise<Run[]> {
  if (pendingRequest) {
    return pendingRequest
  }

  const url = new URL('/api/runs', window.location.origin)
  const pageParams = new URLSearchParams(window.location.search)

  if (pageParams.get('mockError') === '1') {
    url.searchParams.set('mockError', '1')
  }

  pendingRequest = fetch(url, { cache: 'no-store' })
    .then(async (response): Promise<Run[]> => {
      if (!response.ok) {
        throw new Error(
          `Failed to load runs (HTTP ${response.status}). Please try again.`,
        )
      }

      return response.json()
    })
    .finally(() => {
      pendingRequest = undefined
    })

  return pendingRequest
}
