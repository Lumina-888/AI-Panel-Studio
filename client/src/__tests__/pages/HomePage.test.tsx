import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { act } from '@testing-library/react'
import { useAppStore } from '../../stores/appStore'
import { HomePage } from '../../pages/HomePage'

beforeEach(() => {
  vi.restoreAllMocks()
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ json: () => Promise.resolve([]) }))
  act(() => {
    useAppStore.setState({
      discussions: [],
      loading: false,
      activeDiscussionId: null,
      createModalOpen: false,
    })
  })
})

describe('HomePage', () => {
  it('renders AI Panel Studio expand card', () => {
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    )
    expect(screen.getByText('AI Panel Studio')).toBeInTheDocument()
  })

  it('renders CyberCard with "发起新讨论" title', () => {
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    )
    expect(screen.getByText('发起新讨论')).toBeInTheDocument()
  })

  it('renders HomeDiscussionPreview', () => {
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    )
    expect(screen.getByText('最近讨论')).toBeInTheDocument()
  })

  it('fetches discussions on mount', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve([{ id: 'd1', topic: 'AI', expert_count: 2, status: 'live', created_at: '', panelists: [], message_count: 0 }]),
    })
    vi.stubGlobal('fetch', mockFetch)

    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/discussions')
    })
  })

  it('has a link/button to navigate to discussions', () => {
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    )
    const cyberCardBtn = screen.getByText('发起新讨论').closest('button')
    expect(cyberCardBtn).toBeInTheDocument()
  })
})
