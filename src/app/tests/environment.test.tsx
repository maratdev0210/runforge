import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it, vi } from 'vitest'

it('supports React rendering, DOM matchers and user interactions', async () => {
  const onClick = vi.fn()
  const user = userEvent.setup()

  render(<button onClick={onClick}>Check environment</button>)

  const button = screen.getByRole('button', { name: 'Check environment' })
  expect(button).toBeInTheDocument()

  await user.click(button)

  expect(onClick).toHaveBeenCalledTimes(1)
})

