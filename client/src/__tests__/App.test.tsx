import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { act } from '@testing-library/react'
import { useAppStore } from '../stores/appStore'
import { useDiscussionStore } from '../stores/discussionStore'
import App from '../App'

beforeEach(() => {
  vi.restoreAllMocks()
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ json: () => Promise.resolve([]) }))
  vi.stubGlobal('EventSource', vi.fn().mockImplementation(function (this: any) {
    this.addEventListener = vi.fn()
    this.close = vi.fn()
  }))

  act(() => {
    useAppStore.setState({
      discussions: [],
      loading: false,
      activeDiscussionId: null,
      createModalOpen: false,
    })
    useDiscussionStore.setState({
      discussion: null,
      panelists: [],
      messages: [],
      eventSource: null,
    })
  })
})

describe('App routing', () => {
  it('renders HomePage at /', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>
    )

    expect(screen.getByText('最近讨论')).toBeInTheDocument()
  })

  it('renders StudioLayout at /discussions', () => {
    render(
      <MemoryRouter initialEntries={['/discussions']}>
        <App />
      </MemoryRouter>
    )

    expect(screen.getByText('讨论列表')).toBeInTheDocument()
    expect(screen.getByText('🎙️')).toBeInTheDocument()
  })

  it('renders DiscussionRoom at /discussions/:id', () => {
    render(
      <MemoryRouter initialEntries={['/discussions/d1']}>
        <App />
      </MemoryRouter>
    )

    expect(screen.getByText('加载讨论中...')).toBeInTheDocument()
  })
})
