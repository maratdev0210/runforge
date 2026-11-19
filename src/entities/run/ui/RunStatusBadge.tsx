import type { RunStatus } from '../model/types'
import styles from './RunStatusBadge.module.css'

const statusLabels: Record<RunStatus, string> = {
  queued: 'Queued',
  running: 'Running',
  succeeded: 'Succeeded',
  failed: 'Failed',
}

export function RunStatusBadge({ status }: { status: RunStatus }) {
  return (
    <span className={`${styles.badge} ${styles[status]}`}>
      {statusLabels[status]}
    </span>
  )
}
