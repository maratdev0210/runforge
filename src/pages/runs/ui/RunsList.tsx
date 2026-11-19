import { formatRunDate, formatRunDuration, RunStatusBadge } from '../../../entities/run'
import type { Run } from '../../../entities/run'
import styles from './RunsList.module.css'

type RunsListProps = {
  runs: Run[]
  onRunSelect: (runId: string) => void
}

export function RunsList({ runs, onRunSelect }: RunsListProps) {
  return (
    <div className={styles.container}>
      <div className={styles.listHeading}>
        <h2>Recent runs</h2>
        <span>Select a run to view details</span>
      </div>
      <table className={styles.table} role="table" aria-label="Runs">
        <thead>
          <tr role="row">
            {['Run', 'Repository', 'Branch', 'Status', 'Created', 'Duration'].map((label) => (
              <th key={label} scope="col" role="columnheader">{label}</th>
            ))}
          </tr>
        </thead>
        <tbody role="rowgroup">
          {runs.map((run) => (
            <tr key={run.id} role="row" onClick={(event) => {
              event.currentTarget.querySelector('button')?.focus({ preventScroll: true })
              onRunSelect(run.id)
            }}>
              <td role="cell" className={styles.runCell}>
                <button type="button" className={styles.runName}>{run.name}</button>
                <span className={styles.runId}>{run.id}</span>
              </td>
              <td role="cell"><span className={styles.mobileLabel} aria-hidden="true">Repository</span><span className={styles.repository}>{run.repository}</span></td>
              <td role="cell"><span className={styles.mobileLabel} aria-hidden="true">Branch</span><span className={styles.branch}>{run.branch}</span></td>
              <td role="cell" className={styles.statusCell}><span className={styles.mobileLabel} aria-hidden="true">Status</span><RunStatusBadge status={run.status} /></td>
              <td role="cell"><span className={styles.mobileLabel} aria-hidden="true">Created</span><time dateTime={run.createdAt} className={styles.date}>{formatRunDate(run.createdAt)}</time></td>
              <td role="cell" className={styles.durationCell}><span className={styles.mobileLabel} aria-hidden="true">Duration</span><span>{formatRunDuration(run.durationSeconds)}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
