import { useId } from 'react'
import { runSortOptions, runStatusOptions } from '../model/types'
import type { RunSort, RunsFiltersState, RunStatusFilter } from '../model/types'
import styles from './RunsFilters.module.css'

type RunsFiltersProps = RunsFiltersState & {
  resultCount: number
  totalCount: number
  onQueryChange: (query: string) => void
  onStatusChange: (status: RunStatusFilter) => void
  onSortChange: (sort: RunSort) => void
}

export function RunsFilters({
  query, status, sort, resultCount, totalCount,
  onQueryChange, onStatusChange, onSortChange,
}: RunsFiltersProps) {
  const searchId = useId()
  const sortId = useId()

  return (
    <div className={styles.panel}>
      <div className={styles.controls}>
        <div className={styles.search}>
          <label htmlFor={searchId}>Search runs</label>
          <input
            id={searchId}
            type="search"
            placeholder="Search by name or repository"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
          />
        </div>
        <div className={styles.sort}>
          <label htmlFor={sortId}>Sort by</label>
          <div className={styles.selectWrapper}>
            <select id={sortId} value={sort} onChange={(event) => {
              const option = runSortOptions.find((item) => item.value === event.target.value)
              if (option) onSortChange(option.value)
            }}>
              {runSortOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
            <span className={styles.chevron} aria-hidden="true" />
          </div>
        </div>
      </div>
      <fieldset className={styles.statusGroup}>
        <legend>Status</legend>
        <div className={styles.statusButtons}>
          {runStatusOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              aria-pressed={status === option.value}
              onClick={() => onStatusChange(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </fieldset>
      <p className={styles.summary} aria-live="polite" aria-atomic="true">
        Showing {resultCount} of {totalCount} {totalCount === 1 ? 'run' : 'runs'}
      </p>
    </div>
  )
}
