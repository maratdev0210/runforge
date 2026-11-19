import type { RunStatus } from '../../../entities/run'

export type RunStatusFilter = 'all' | RunStatus

export const runStatusOptions = [
  { value: 'all', label: 'All' },
  { value: 'queued', label: 'Queued' },
  { value: 'running', label: 'Running' },
  { value: 'succeeded', label: 'Succeeded' },
  { value: 'failed', label: 'Failed' },
] as const satisfies ReadonlyArray<{ value: RunStatusFilter; label: string }>

export const runSortOptions = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'longest', label: 'Longest duration' },
  { value: 'shortest', label: 'Shortest duration' },
] as const

export type RunSort = (typeof runSortOptions)[number]['value']

export type RunsFiltersState = {
  query: string
  status: RunStatusFilter
  sort: RunSort
}
