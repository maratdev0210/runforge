import { http, HttpResponse } from 'msw/http'
import { delay } from 'msw/utils/delay'
import { runs } from './fixtures/runs'

export function createRunsHandlers({ delayMs = 700 } = {}) {
  let hasReturnedMockError = false

  return [
    http.get('*/api/runs', async ({ request }) => {
      const url = new URL(request.url)
      const shouldFail =
        url.searchParams.get('mockError') === '1' && !hasReturnedMockError

      if (shouldFail) {
        hasReturnedMockError = true
      }

      await delay(delayMs)

      if (shouldFail) {
        return HttpResponse.json(
          { message: 'Failed to load runs. Please try again.' },
          { status: 500 },
        )
      }

      return HttpResponse.json(runs)
    }),
  ]
}

export const handlers = createRunsHandlers()
