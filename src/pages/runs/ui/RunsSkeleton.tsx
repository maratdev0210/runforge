import styles from './RunsStates.module.css'

export function RunsSkeleton() {
  return (
    <div>
      <p role="status" className={styles.loadingLabel}>Loading runs</p>
      <div className={styles.skeleton} aria-hidden="true">
        <div className={styles.skeletonHeading} />
        {Array.from({ length: 6 }, (_, index) => (
          <div className={styles.skeletonRow} key={index}>
            <span /><span /><span />
          </div>
        ))}
      </div>
    </div>
  )
}
