import { useEffect, useId, useRef } from 'react'
import { formatRunDate, formatRunDuration, RunStatusBadge } from '../../../entities/run'
import type { Run } from '../../../entities/run'
import styles from './RunDetailsDrawer.module.css'

export function RunDetailsDrawer({ run, onClose }: { run: Run; onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const titleId = useId()
  const descriptionId = useId()

  useEffect(() => {
    const dialog = dialogRef.current!
    const opener = document.activeElement
    const previousOverflow = document.body.style.overflow

    dialog.showModal()
    closeButtonRef.current?.focus({ preventScroll: true })
    document.body.style.overflow = 'hidden'

    return () => {
      dialog.close()
      document.body.style.overflow = previousOverflow
      if (opener instanceof HTMLElement && opener.isConnected) {
        opener.focus({ preventScroll: true })
      }
    }
  }, [run.id])

  return (
    <dialog
      ref={dialogRef}
      className={styles.drawer}
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      onCancel={(event) => { event.preventDefault(); onClose() }}
      onClick={(event) => {
        if (event.target !== event.currentTarget) return
        const bounds = event.currentTarget.getBoundingClientRect()
        if (event.clientX < bounds.left || event.clientX > bounds.right ||
            event.clientY < bounds.top || event.clientY > bounds.bottom) {
          onClose()
        }
      }}
    >
      <header className={styles.header}>
        <span>Run details</span>
        <button ref={closeButtonRef} type="button" className={styles.close} onClick={onClose}>
          Close <span aria-hidden="true">×</span>
        </button>
      </header>
      <div className={styles.content}>
        <div className={styles.heading}>
          <RunStatusBadge status={run.status} />
          <h2 id={titleId}>{run.name}</h2>
          <p id={descriptionId} className={styles.runId}>{run.id}</p>
        </div>
        <dl className={styles.metadata}>
          <div><dt>Repository</dt><dd>{run.repository}</dd></div>
          <div><dt>Branch</dt><dd className={styles.branch}>{run.branch}</dd></div>
          <div><dt>Created</dt><dd><time dateTime={run.createdAt}>{formatRunDate(run.createdAt)}</time></dd></div>
          <div><dt>Duration</dt><dd>{formatRunDuration(run.durationSeconds)}</dd></div>
        </dl>
        <section className={styles.section} aria-labelledby={`${titleId}-logs`}>
          <h3 id={`${titleId}-logs`}>Logs <span>{run.logs.length} entries</span></h3>
          {run.logs.length > 0
            ? <pre className={styles.logs} tabIndex={0} aria-label="Run logs">{run.logs.join('\n')}</pre>
            : <p className={styles.noLogs}>No logs available</p>}
        </section>
        {run.result !== undefined && (
          <section className={styles.section} aria-labelledby={`${titleId}-result`}>
            <h3 id={`${titleId}-result`}>Result</h3>
            <p className={styles.result}>{run.result}</p>
          </section>
        )}
      </div>
    </dialog>
  )
}
