import { useCallback, useState } from 'react'
import { useRuns } from '../model/useRuns'
import { RunDetailsDrawer } from './RunDetailsDrawer'
import { RunsEmpty } from './RunsEmpty'
import { RunsError } from './RunsError'
import { RunsList } from './RunsList'
import { RunsSkeleton } from './RunsSkeleton'
import styles from './RunsPage.module.css'

export function RunsPage() {
  const { state, retry } = useRuns()
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null)
  const closeDetails = useCallback(() => setSelectedRunId(null), [])
  const selectedRun = state.status === 'success'
    ? state.runs.find((run) => run.id === selectedRunId)
    : undefined

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.brand}>
          <span className={styles.brandMark} aria-hidden="true">r<span>f</span></span>
          <span>RunForge</span>
        </div>
        <span className={styles.workspace}>Agent workspace</span>
      </header>

      <main className={styles.main}>
        <div className={styles.pageHeading}>
          <div>
            <p className={styles.eyebrow}>Execution history</p>
            <div className={styles.titleRow}>
              <h1>Runs</h1>
              {state.status === 'success' && (
                <span className={styles.count} aria-label={`${state.runs.length} ${state.runs.length === 1 ? 'run' : 'runs'}`}>
                  {state.runs.length}
                </span>
              )}
            </div>
            <p className={styles.description}>Every agent run, from start to finish.</p>
          </div>
        </div>

        <section aria-label="Agent runs" aria-busy={state.status === 'loading'}>
          {state.status === 'loading' && <RunsSkeleton />}
          {state.status === 'error' && <RunsError message={state.message} onRetry={retry} />}
          {state.status === 'success' && (
            state.runs.length > 0
              ? <RunsList runs={state.runs} onRunSelect={setSelectedRunId} />
              : <RunsEmpty />
          )}
        </section>

        <p className={styles.footnote}>Dates and times are shown in your local timezone.</p>
      </main>

      {selectedRun && <RunDetailsDrawer run={selectedRun} onClose={closeDetails} />}
    </div>
  )
}
