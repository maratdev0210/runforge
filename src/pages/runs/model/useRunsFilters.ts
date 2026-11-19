import { useEffect, useState } from 'react'
import { runSortOptions, runStatusOptions } from './types'
import type { RunSort, RunsFiltersState, RunStatusFilter } from './types'

function readFiltersFromUrl(): RunsFiltersState {
  const params = new URLSearchParams(window.location.search)

  return {
    query: params.get('q') ?? '',
    status: runStatusOptions.find((option) => option.value === params.get('status'))?.value ?? 'all',
    sort: runSortOptions.find((option) => option.value === params.get('sort'))?.value ?? 'newest',
  }
}

function writeFiltersToUrl(filters: RunsFiltersState) {
  const url = new URL(window.location.href)
  const values = {
    q: filters.query,
    status: filters.status === 'all' ? '' : filters.status,
    sort: filters.sort === 'newest' ? '' : filters.sort,
  }

  for (const [key, value] of Object.entries(values)) {
    if (value) url.searchParams.set(key, value)
    else url.searchParams.delete(key)
  }

  window.history.replaceState(window.history.state, '', url.toString())
}

export function useRunsFilters() {
  const [filters, setFilters] = useState(readFiltersFromUrl)

  useEffect(() => {
    const restoreFilters = () => setFilters(readFiltersFromUrl())
    window.addEventListener('popstate', restoreFilters)
    return () => window.removeEventListener('popstate', restoreFilters)
  }, [])

  function updateFilters(nextFilters: RunsFiltersState) {
    writeFiltersToUrl(nextFilters)
    setFilters(nextFilters)
  }

  return {
    filters,
    setQuery: (query: string) => updateFilters({ ...filters, query }),
    setStatus: (status: RunStatusFilter) => updateFilters({ ...filters, status }),
    setSort: (sort: RunSort) => updateFilters({ ...filters, sort }),
    clearFilters: () => updateFilters({ ...filters, query: '', status: 'all' }),
  }
}
