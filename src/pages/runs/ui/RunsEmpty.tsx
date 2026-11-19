import styles from './RunsStates.module.css'

export function RunsEmpty() {
  return (
    <div className={styles.state} role="status">
      <p className={styles.symbol} aria-hidden="true">—</p>
      <h2>No runs yet</h2>
      <p className={styles.description}>Your agent runs will appear here once they are available.</p>
    </div>
  )
}
