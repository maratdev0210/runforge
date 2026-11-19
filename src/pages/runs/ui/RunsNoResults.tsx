import styles from './RunsStates.module.css'

export function RunsNoResults({ onClear }: { onClear: () => void }) {
  return (
    <div className={styles.state}>
      <p className={styles.symbol} aria-hidden="true">—</p>
      <h2>No runs found</h2>
      <p className={styles.description}>
        No runs match your search and status. Clear filters to see all runs.
      </p>
      <button type="button" className={styles.clearFilters} onClick={onClear}>Clear filters</button>
    </div>
  )
}
