import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, expect, test, vi } from 'vitest'
import TripList from './TripList'

beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => [],
    })
  )
})

test('renders the Trip Planner heading', () => {
  render(
    <MemoryRouter>
      <TripList />
    </MemoryRouter>
  )

  expect(screen.getByRole('heading', { name: 'Trip Planner' })).toBeInTheDocument()
})
