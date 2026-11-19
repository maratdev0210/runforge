import { StrictMode } from 'react'
import { act, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterAll, afterEach, beforeAll, beforeEach, expect, it, vi } from 'vitest'
import { getRuns } from '../../../entities/run'
import type { Run } from '../../../entities/run'
import { RunsPage } from '../ui/RunsPage'

vi.mock('../../../entities/run', async (importOriginal) => ({
  ...await importOriginal<typeof import('../../../entities/run')>(),
  getRuns: vi.fn(),
}))

const sampleRun: Run = {
  id: 'test_queued',
  name: 'Website audit',
  repository: 'team/website-audit',
  branch: 'feature/audit',
  status: 'queued',
  createdAt: '2026-11-19T10:00:00Z',
  logs: ['Input validated.', 'Waiting for a worker.'],
}

const sampleRuns: Run[] = [
  sampleRun,
  { ...sampleRun, id: 'test_running', name: 'Inbox triage', status: 'running' },
  {
    ...sampleRun,
    id: 'test_succeeded',
    name: 'Invoice matching',
    status: 'succeeded',
    durationSeconds: 3735,
    logs: ['Loaded 12 invoices.', 'Matched all 12 invoices.'],
    result: 'All invoices matched successfully.',
  },
  {
    ...sampleRun,
    id: 'test_failed',
    name: 'Calendar review',
    status: 'failed',
    durationSeconds: 0,
    logs: [],
  },
]

function deferredRuns() {
  let resolve!: (runs: Run[]) => void
  const promise = new Promise<Run[]>((fulfill) => { resolve = fulfill })
  return { promise, resolve }
}

// jsdom has no native modal behavior. These shims only model open/close;
// browser focus containment and the backdrop need a manual browser check.
const originalShowModal = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, 'showModal')
const originalClose = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, 'close')

beforeAll(() => {
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
    configurable: true,
    value(this: HTMLDialogElement) { this.setAttribute('open', '') },
  })
  Object.defineProperty(HTMLDialogElement.prototype, 'close', {
    configurable: true,
    value(this: HTMLDialogElement) { this.removeAttribute('open') },
  })
})

afterAll(() => {
  for (const [name, descriptor] of [
    ['showModal', originalShowModal],
    ['close', originalClose],
  ] as const) {
    if (descriptor) Object.defineProperty(HTMLDialogElement.prototype, name, descriptor)
    else Reflect.deleteProperty(HTMLDialogElement.prototype, name)
  }
})

beforeEach(() => {
  vi.mocked(getRuns).mockReset()
})

afterEach(() => {
  document.body.style.overflow = ''
})

it('shows loading, then runs with all statuses and formatted values', async () => {
  const request = deferredRuns()
  vi.mocked(getRuns).mockReturnValue(request.promise)
  render(<RunsPage />)

  expect(screen.getByRole('status')).toHaveTextContent('Loading runs')
  expect(screen.getByRole('region', { name: 'Agent runs' })).toHaveAttribute('aria-busy', 'true')
  expect(screen.queryByRole('table')).not.toBeInTheDocument()
  expect(screen.queryByRole('searchbox')).not.toBeInTheDocument()

  await act(async () => request.resolve(sampleRuns))

  const table = screen.getByRole('table', { name: 'Runs' })
  expect(within(table).getAllByRole('button').map((button) => button.textContent))
    .toEqual(sampleRuns.map((run) => run.name))
  for (const status of ['Queued', 'Running', 'Succeeded', 'Failed']) {
    expect(within(table).getByText(status)).toBeInTheDocument()
  }
  expect(screen.getByLabelText('4 runs')).toHaveTextContent('4')
  expect(within(table).getAllByText(sampleRun.repository)).toHaveLength(4)
  expect(within(table).getAllByText(sampleRun.branch)).toHaveLength(4)
  expect(within(table).getByText('1h 2m 15s')).toBeInTheDocument()
  expect(within(table).getByText('0s')).toBeInTheDocument()
  expect(table.querySelector('time')).toHaveAttribute('dateTime', sampleRun.createdAt)
  expect(screen.getByRole('region', { name: 'Agent runs' })).toHaveAttribute('aria-busy', 'false')
  expect(getRuns).toHaveBeenCalledTimes(1)
})

it('shows an error and returns to loading during Retry before displaying data', async () => {
  const retryRequest = deferredRuns()
  vi.mocked(getRuns)
    .mockRejectedValueOnce(new Error('Failed to load runs (HTTP 500). Please try again.'))
    .mockReturnValueOnce(retryRequest.promise)
  const user = userEvent.setup()
  render(<RunsPage />)

  expect(await screen.findByRole('alert')).toHaveTextContent('Unable to load runs')
  await user.click(screen.getByRole('button', { name: 'Retry' }))
  expect(screen.getByRole('status')).toHaveTextContent('Loading runs')
  expect(screen.queryByRole('alert')).not.toBeInTheDocument()

  await act(async () => retryRequest.resolve([sampleRun]))
  expect(screen.getByRole('button', { name: sampleRun.name })).toBeInTheDocument()
  expect(getRuns).toHaveBeenCalledTimes(2)
})

it('shows a distinct empty state for a successful empty response', async () => {
  vi.mocked(getRuns).mockResolvedValue([])
  render(<RunsPage />)

  expect(await screen.findByRole('heading', { name: 'No runs yet' })).toBeInTheDocument()
  expect(screen.getByLabelText('0 runs')).toHaveTextContent('0')
  expect(screen.queryByRole('table')).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Retry' })).not.toBeInTheDocument()
  expect(screen.queryByRole('searchbox')).not.toBeInTheDocument()
})

it('opens details from a row, shows logs and result, and closes without reloading', async () => {
  vi.mocked(getRuns).mockResolvedValue(sampleRuns)
  const user = userEvent.setup()
  render(<RunsPage />)

  const opener = await screen.findByRole('button', { name: 'Invoice matching' })
  const row = opener.closest('tr')!
  await user.click(within(row).getByText(sampleRun.repository))

  const dialog = screen.getByRole('dialog', { name: 'Invoice matching' })
  expect(within(dialog).getByText('test_succeeded')).toBeInTheDocument()
  expect(within(dialog).getByText('Succeeded')).toBeInTheDocument()
  expect(within(dialog).getByText(sampleRun.repository)).toBeInTheDocument()
  expect(within(dialog).getByText(sampleRun.branch)).toBeInTheDocument()
  expect(within(dialog).getByText('1h 2m 15s')).toBeInTheDocument()
  expect(within(dialog).getByLabelText('Run logs').textContent)
    .toBe('Loaded 12 invoices.\nMatched all 12 invoices.')
  expect(within(dialog).getByText('All invoices matched successfully.')).toBeInTheDocument()
  expect(document.body.style.overflow).toBe('hidden')

  await user.click(within(dialog).getByRole('button', { name: 'Close' }))

  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  expect(opener).toHaveFocus()
  expect(document.body.style.overflow).toBe('')
  expect(screen.getByRole('table')).toBeInTheDocument()
  expect(getRuns).toHaveBeenCalledTimes(1)
})

it('opens with the keyboard, focuses Close and handles the native Escape cancel event', async () => {
  vi.mocked(getRuns).mockResolvedValue([sampleRun])
  const user = userEvent.setup()
  render(<RunsPage />)
  const opener = await screen.findByRole('button', { name: sampleRun.name })

  await user.tab()
  expect(screen.getByRole('searchbox', { name: 'Search runs' })).toHaveFocus()
  await user.tab()
  expect(screen.getByRole('combobox', { name: 'Sort by' })).toHaveFocus()
  for (const label of ['All', 'Queued', 'Running', 'Succeeded', 'Failed']) {
    await user.tab()
    expect(screen.getByRole('button', { name: label })).toHaveFocus()
  }
  await user.tab()
  expect(opener).toHaveFocus()
  await user.keyboard('{Enter}')
  const dialog = screen.getByRole('dialog', { name: sampleRun.name })
  expect(within(dialog).getByRole('button', { name: 'Close' })).toHaveFocus()

  fireEvent(dialog, new Event('cancel', { cancelable: true }))
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  expect(opener).toHaveFocus()
})

it('closes on a backdrop click, but not on empty space inside the drawer', async () => {
  vi.mocked(getRuns).mockResolvedValue([sampleRun])
  const user = userEvent.setup()
  render(<RunsPage />)
  await user.click(await screen.findByRole('button', { name: sampleRun.name }))
  const dialog = screen.getByRole('dialog')
  vi.spyOn(dialog, 'getBoundingClientRect').mockReturnValue(new DOMRect(200, 0, 560, 800))

  fireEvent.click(dialog, { clientX: 300, clientY: 200 })
  expect(dialog).toBeInTheDocument()

  fireEvent.click(dialog, { clientX: 50, clientY: 200 })
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
})

it('handles missing duration and result without inventing values', async () => {
  vi.mocked(getRuns).mockResolvedValue([sampleRun])
  const user = userEvent.setup()
  render(<RunsPage />)
  const opener = await screen.findByRole('button', { name: sampleRun.name })
  expect(within(opener.closest('tr')!).getByText('—')).toBeInTheDocument()

  await user.click(opener)
  const dialog = screen.getByRole('dialog')
  expect(within(dialog).getByText('—')).toBeInTheDocument()
  expect(within(dialog).queryByRole('heading', { name: 'Result' })).not.toBeInTheDocument()
})

it('shows zero duration and an explicit empty-logs message in details', async () => {
  vi.mocked(getRuns).mockResolvedValue([sampleRuns[3]])
  const user = userEvent.setup()
  render(<RunsPage />)
  await user.click(await screen.findByRole('button', { name: 'Calendar review' }))

  const dialog = screen.getByRole('dialog')
  expect(within(dialog).getByText('0s')).toBeInTheDocument()
  expect(within(dialog).getByText('No logs available')).toBeInTheDocument()
  expect(within(dialog).queryByLabelText('Run logs')).not.toBeInTheDocument()
})

it('ignores an outdated effect response under StrictMode', async () => {
  const outdated = deferredRuns()
  const current = deferredRuns()
  vi.mocked(getRuns)
    .mockReturnValueOnce(outdated.promise)
    .mockReturnValueOnce(current.promise)
  render(<StrictMode><RunsPage /></StrictMode>)

  await act(async () => outdated.resolve(sampleRuns))
  expect(screen.getByRole('status')).toHaveTextContent('Loading runs')

  await act(async () => current.resolve([sampleRun]))
  expect(screen.getByLabelText('1 run')).toHaveTextContent('1')
  expect(within(screen.getByRole('table')).getAllByRole('button')).toHaveLength(1)
})

it('restores the previous body overflow when unmounted with details open', async () => {
  document.body.style.overflow = 'scroll'
  vi.mocked(getRuns).mockResolvedValue([sampleRun])
  const user = userEvent.setup()
  const { unmount } = render(<RunsPage />)
  await user.click(await screen.findByRole('button', { name: sampleRun.name }))
  expect(document.body.style.overflow).toBe('hidden')

  unmount()
  expect(document.body.style.overflow).toBe('scroll')
})

const controlsRuns: Run[] = [
  { ...sampleRun, id: 'queued_recent', name: 'Website audit', repository: 'storefront/web' },
  {
    ...sampleRun, id: 'running', name: 'Invoice importer', repository: 'ledger/collector',
    status: 'running', createdAt: '2026-11-19T10:30:00Z', durationSeconds: 15,
  },
  {
    ...sampleRun, id: 'succeeded_old', name: 'Invoice matching', repository: 'ledger/matcher',
    status: 'succeeded', createdAt: '2026-11-19T09:00:00Z', durationSeconds: 60,
    result: 'All invoices matched successfully.',
  },
  {
    ...sampleRun, id: 'failed_first', name: 'Calendar review', repository: 'office/calendar',
    status: 'failed', createdAt: '2026-11-19T11:00:00Z', durationSeconds: 0,
  },
  {
    ...sampleRun, id: 'succeeded_recent', name: 'Daily reconciliation', repository: 'ledger/reports',
    status: 'succeeded', durationSeconds: 60,
  },
  {
    ...sampleRun, id: 'queued_old', name: 'Product scan', repository: 'commerce/catalog',
    createdAt: '2026-11-19T08:00:00Z',
  },
  {
    ...sampleRun, id: 'failed_second', name: 'Payment audit', repository: 'payments/gateway',
    status: 'failed', createdAt: '2026-11-19T11:00:00Z', durationSeconds: 0,
  },
]

function visibleRunNames() {
  return within(screen.getByRole('table', { name: 'Runs' }))
    .getAllByRole('button').map((button) => button.textContent)
}

async function renderControls() {
  vi.mocked(getRuns).mockResolvedValue(controlsRuns)
  const user = userEvent.setup()
  render(<RunsPage />)
  await screen.findByRole('searchbox', { name: 'Search runs' })
  return user
}

it.each([
  ['Queued', ['Website audit', 'Product scan']],
  ['Running', ['Invoice importer']],
  ['Succeeded', ['Daily reconciliation', 'Invoice matching']],
  ['Failed', ['Calendar review', 'Payment audit']],
] as const)('filters by %s, marks the active button and restores All', async (label, expected) => {
  const user = await renderControls()
  await user.click(screen.getByRole('button', { name: label }))

  expect(visibleRunNames()).toEqual(expected)
  expect(screen.getByRole('button', { name: label })).toHaveAttribute('aria-pressed', 'true')
  expect(screen.getByRole('button', { name: 'All' })).toHaveAttribute('aria-pressed', 'false')
  expect(screen.getByText(`Showing ${expected.length} of 7 runs`)).toHaveAttribute('aria-live', 'polite')
  expect(screen.getByLabelText(`${expected.length} ${expected.length === 1 ? 'run' : 'runs'}`))
    .toHaveTextContent(String(expected.length))

  await user.click(screen.getByRole('button', { name: 'All' }))
  expect(visibleRunNames()).toHaveLength(7)
  expect(getRuns).toHaveBeenCalledTimes(1)
})

it.each(['Invoice', '  iNvOiCe  '])('searches by name with normalized query %j', async (query) => {
  const user = await renderControls()
  await user.type(screen.getByRole('searchbox'), query)

  expect(visibleRunNames()).toEqual(['Invoice importer', 'Invoice matching'])
  expect(screen.getByRole('searchbox')).toHaveValue(query)
  expect(screen.getByText('Showing 2 of 7 runs')).toBeInTheDocument()
  expect(getRuns).toHaveBeenCalledTimes(1)
})

it('searches by repository and combines it with the selected status', async () => {
  const user = await renderControls()
  await user.type(screen.getByRole('searchbox'), 'LEDGER/')
  expect(visibleRunNames()).toEqual(['Invoice importer', 'Daily reconciliation', 'Invoice matching'])

  await user.click(screen.getByRole('button', { name: 'Succeeded' }))
  expect(visibleRunNames()).toEqual(['Daily reconciliation', 'Invoice matching'])
  expect(getRuns).toHaveBeenCalledTimes(1)
})

it('does not restrict results for whitespace and does not search branches, IDs, logs or results', async () => {
  const user = await renderControls()
  const search = screen.getByRole('searchbox')
  await user.type(search, '   ')
  expect(visibleRunNames()).toHaveLength(7)

  for (const query of ['feature/audit', 'queued_recent', 'Waiting for a worker.', 'All invoices matched successfully.']) {
    await user.clear(search)
    await user.type(search, query)
    expect(screen.getByRole('heading', { name: 'No runs found' })).toBeInTheDocument()
  }

  await user.clear(search)
  expect(visibleRunNames()).toHaveLength(7)
  expect(getRuns).toHaveBeenCalledTimes(1)
})

it('clears a no-results query and status while preserving sort and unrelated URL values', async () => {
  window.history.replaceState(null, '', '/?mockError=1#runs')
  const user = await renderControls()
  await user.selectOptions(screen.getByRole('combobox', { name: 'Sort by' }), 'longest')
  await user.click(screen.getByRole('button', { name: 'Failed' }))
  await user.type(screen.getByRole('searchbox'), 'missing run')

  expect(screen.getByRole('heading', { name: 'No runs found' })).toBeInTheDocument()
  expect(screen.queryByRole('table')).not.toBeInTheDocument()
  expect(screen.getByLabelText('0 runs')).toHaveTextContent('0')
  expect(screen.getByRole('searchbox')).toBeInTheDocument()

  await user.click(screen.getByRole('button', { name: 'Clear filters' }))

  expect(screen.getByRole('searchbox')).toHaveValue('')
  expect(screen.getByRole('button', { name: 'All' })).toHaveAttribute('aria-pressed', 'true')
  expect(screen.getByRole('combobox', { name: 'Sort by' })).toHaveValue('longest')
  expect(visibleRunNames()).toHaveLength(7)
  const url = new URL(window.location.href)
  expect(url.searchParams.has('q')).toBe(false)
  expect(url.searchParams.has('status')).toBe(false)
  expect(url.searchParams.get('sort')).toBe('longest')
  expect(url.searchParams.get('mockError')).toBe('1')
  expect(url.hash).toBe('#runs')
  expect(getRuns).toHaveBeenCalledTimes(1)
})

it.each([
  ['newest', ['failed_first', 'failed_second', 'running', 'queued_recent', 'succeeded_recent', 'succeeded_old', 'queued_old']],
  ['oldest', ['queued_old', 'succeeded_old', 'queued_recent', 'succeeded_recent', 'running', 'failed_first', 'failed_second']],
  ['longest', ['succeeded_recent', 'succeeded_old', 'running', 'failed_first', 'failed_second', 'queued_recent', 'queued_old']],
  ['shortest', ['failed_first', 'failed_second', 'running', 'succeeded_recent', 'succeeded_old', 'queued_recent', 'queued_old']],
] as const)('sorts by %s with zero, missing values and stable ties', async (sort, expectedIds) => {
  const user = await renderControls()
  await user.selectOptions(screen.getByRole('combobox', { name: 'Sort by' }), sort)

  expect(visibleRunNames()).toEqual(expectedIds.map((id) => controlsRuns.find((run) => run.id === id)!.name))
  expect(getRuns).toHaveBeenCalledTimes(1)
})

it('applies sorting after search and status without mutating the loaded array', async () => {
  const data = [...controlsRuns]
  const originalIds = data.map((run) => run.id)
  Object.freeze(data)
  vi.mocked(getRuns).mockResolvedValue(data)
  const user = userEvent.setup()
  render(<RunsPage />)
  const search = await screen.findByRole('searchbox')
  await user.type(search, 'ledger')
  await user.click(screen.getByRole('button', { name: 'Succeeded' }))
  await user.selectOptions(screen.getByRole('combobox'), 'oldest')

  expect(visibleRunNames()).toEqual(['Invoice matching', 'Daily reconciliation'])
  expect(data.map((run) => run.id)).toEqual(originalIds)
  expect(getRuns).toHaveBeenCalledTimes(1)
})

it('restores all controls and results from the initial URL', async () => {
  const url = new URL(window.location.href)
  url.search = '?status=succeeded&sort=longest'
  url.searchParams.set('q', '  INVOICE  ')
  window.history.replaceState(null, '', url)
  await renderControls()

  expect(screen.getByRole('searchbox')).toHaveValue('  INVOICE  ')
  expect(screen.getByRole('button', { name: 'Succeeded' })).toHaveAttribute('aria-pressed', 'true')
  expect(screen.getByRole('combobox')).toHaveValue('longest')
  expect(visibleRunNames()).toEqual(['Invoice matching'])
})

it('persists changes using replaceState without losing history state, unrelated params or hash', async () => {
  window.history.replaceState({ scroll: 42 }, '', '/?mockError=1&campaign=demo#history')
  const historyLength = window.history.length
  const pushState = vi.spyOn(window.history, 'pushState')
  const user = await renderControls()
  await user.type(screen.getByRole('searchbox'), 'a & b/')
  await user.click(screen.getByRole('button', { name: 'Running' }))
  await user.selectOptions(screen.getByRole('combobox'), 'shortest')

  const url = new URL(window.location.href)
  expect(url.searchParams.get('q')).toBe('a & b/')
  expect(url.searchParams.get('status')).toBe('running')
  expect(url.searchParams.get('sort')).toBe('shortest')
  expect(url.searchParams.get('mockError')).toBe('1')
  expect(url.searchParams.get('campaign')).toBe('demo')
  expect(url.pathname).toBe('/')
  expect(url.hash).toBe('#history')
  expect(window.history.state).toEqual({ scroll: 42 })
  expect(window.history.length).toBe(historyLength)
  expect(pushState).not.toHaveBeenCalled()
})

it('removes default query parameters when controls return to default values', async () => {
  window.history.replaceState(null, '', '/?q=invoice&status=succeeded&sort=longest&mockError=1')
  const user = await renderControls()
  await user.clear(screen.getByRole('searchbox'))
  await user.click(screen.getByRole('button', { name: 'All' }))
  await user.selectOptions(screen.getByRole('combobox'), 'newest')

  expect(window.location.search).toBe('?mockError=1')
  expect(visibleRunNames()).toHaveLength(7)
})

it('restores persisted settings after unmounting and mounting the page again', async () => {
  vi.mocked(getRuns).mockResolvedValue(controlsRuns)
  const user = userEvent.setup()
  const firstPage = render(<RunsPage />)
  await user.type(await screen.findByRole('searchbox'), 'ledger')
  await user.click(screen.getByRole('button', { name: 'Succeeded' }))
  await user.selectOptions(screen.getByRole('combobox'), 'oldest')
  firstPage.unmount()

  render(<RunsPage />)
  expect(await screen.findByRole('searchbox')).toHaveValue('ledger')
  expect(screen.getByRole('combobox')).toHaveValue('oldest')
  expect(screen.getByRole('button', { name: 'Succeeded' })).toHaveAttribute('aria-pressed', 'true')
  expect(visibleRunNames()).toEqual(['Invoice matching', 'Daily reconciliation'])
})

it('uses defaults for invalid status and sort values without clearing the search', async () => {
  window.history.replaceState(null, '', '/?q=ledger&status=unknown&sort=invalid')
  await renderControls()

  expect(screen.getByRole('searchbox')).toHaveValue('ledger')
  expect(screen.getByRole('button', { name: 'All' })).toHaveAttribute('aria-pressed', 'true')
  expect(screen.getByRole('combobox')).toHaveValue('newest')
  expect(visibleRunNames()).toEqual(['Invoice importer', 'Daily reconciliation', 'Invoice matching'])
})

it('updates controls and results on popstate without reloading runs', async () => {
  await renderControls()
  window.history.pushState(null, '', '/?q=ledger&status=succeeded&sort=oldest')
  fireEvent(window, new PopStateEvent('popstate'))

  expect(screen.getByRole('searchbox')).toHaveValue('ledger')
  expect(screen.getByRole('combobox')).toHaveValue('oldest')
  expect(screen.getByRole('button', { name: 'Succeeded' })).toHaveAttribute('aria-pressed', 'true')
  expect(visibleRunNames()).toEqual(['Invoice matching', 'Daily reconciliation'])

  window.history.replaceState(null, '', '/')
  fireEvent(window, new PopStateEvent('popstate'))
  expect(screen.getByRole('searchbox')).toHaveValue('')
  expect(screen.getByRole('combobox')).toHaveValue('newest')
  expect(visibleRunNames()).toHaveLength(7)
  expect(getRuns).toHaveBeenCalledTimes(1)
})

it('keeps search, status, sort and the visible list after closing details', async () => {
  const user = await renderControls()
  await user.type(screen.getByRole('searchbox'), 'ledger')
  await user.click(screen.getByRole('button', { name: 'Succeeded' }))
  await user.selectOptions(screen.getByRole('combobox'), 'oldest')
  const urlBefore = window.location.href
  const opener = screen.getByRole('button', { name: 'Invoice matching' })
  await user.click(opener)
  expect(screen.getByRole('dialog', { name: 'Invoice matching' })).toBeInTheDocument()
  await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Close' }))

  expect(screen.getByRole('searchbox')).toHaveValue('ledger')
  expect(screen.getByRole('combobox')).toHaveValue('oldest')
  expect(screen.getByRole('button', { name: 'Succeeded' })).toHaveAttribute('aria-pressed', 'true')
  expect(visibleRunNames()).toEqual(['Invoice matching', 'Daily reconciliation'])
  expect(window.location.href).toBe(urlBefore)
  expect(opener).toHaveFocus()
  expect(getRuns).toHaveBeenCalledTimes(1)
})
