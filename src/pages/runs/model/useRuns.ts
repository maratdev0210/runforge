import { useCallback, useEffect, useState } from 'react'
import { getRuns } from '../../../entities/run'
import type { Run } from '../../../entities/run'

type RunsState =
  | { status: 'loading' }
  | { status: 'success'; runs: Run[] }
  | { status: 'error'; message: string }

export function useRuns() {
  const [state, setState] = useState<RunsState>({ status: 'loading' })
  const [requestNumber, setRequestNumber] = useState(0)
  const retry = useCallback(() => setRequestNumber((number) => number + 1), [])

  useEffect(() => {
    let active = true
    setState({ status: 'loading' })

    getRuns().then(
      (runs) => {
        if (active) setState({ status: 'success', runs })
      },
      (error: unknown) => {
        if (active) {
          setState({
            status: 'error',
            message: error instanceof Error ? error.message : 'Please try again.',
          })
        }
      },
    )

    return () => { active = false }
  }, [requestNumber])

  return { state, retry }
}
