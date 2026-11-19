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

it('shows loading, then runs in API order with all statuses and formatted values', async () => {
  const request = deferredRuns()
  vi.mocked(getRuns).mockReturnValue(request.promise)
  render(<RunsPage />)

  expect(screen.getByRole('status')).toHaveTextContent('Loading runs')
  expect(screen.getByRole('region', { name: 'Agent runs' })).toHaveAttribute('aria-busy', 'true')
  expect(screen.queryByRole('table')).not.toBeInTheDocument()

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
  expect(screen.getAllByRole('button')).toHaveLength(1)
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
