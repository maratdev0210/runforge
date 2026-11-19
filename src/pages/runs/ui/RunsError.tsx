import styles from './RunsStates.module.css'

export function RunsError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className={styles.state}>
      <div role="alert">
        <p className={styles.symbol} aria-hidden="true">!</p>
        <h2>Unable to load runs</h2>
        <p className={styles.description}>{message}</p>
      </div>
      <button type="button" className={styles.retry} onClick={onRetry}>Retry</button>
    </div>
  )
}
