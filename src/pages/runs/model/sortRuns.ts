import type { Run } from '../../../entities/run'
import type { RunSort } from './types'

export function sortRuns(runs: Run[], sort: RunSort): Run[] {
  return [...runs].sort((left, right) => {
    const newestFirst = Date.parse(right.createdAt) - Date.parse(left.createdAt)

    if (sort === 'newest') return newestFirst
    if (sort === 'oldest') return -newestFirst

    if (left.durationSeconds === undefined && right.durationSeconds === undefined) {
      return newestFirst
    }
    if (left.durationSeconds === undefined) return 1
    if (right.durationSeconds === undefined) return -1

    const durationDifference = sort === 'longest'
      ? right.durationSeconds - left.durationSeconds
      : left.durationSeconds - right.durationSeconds

    return durationDifference || newestFirst
  })
}
