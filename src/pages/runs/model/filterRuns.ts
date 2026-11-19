import type { Run } from '../../../entities/run'
import type { RunsFiltersState } from './types'

export function filterRuns(
  runs: Run[],
  { query, status }: Pick<RunsFiltersState, 'query' | 'status'>,
): Run[] {
  const normalizedQuery = query.trim().toLowerCase()

  return runs.filter((run) =>
    (status === 'all' || run.status === status) &&
    (run.name.toLowerCase().includes(normalizedQuery) ||
      run.repository.toLowerCase().includes(normalizedQuery)),
  )
}
