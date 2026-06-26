import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { act } from '@testing-library/react'
import { useAppStore } from '../../stores/appStore'
import { useDiscussionStore } from '../../stores/discussionStore'
import { StudioLayout } from '../../pages/StudioLayout'

beforeEach(() => {
  vi.restoreAllMocks()
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ json: () => Promise.resolve([]) }))
  vi.stubGlobal('EventSource', vi.fn(() => ({
    addEventListener: vi.fn(),
    close: vi.fn(),
  })))

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

describe('StudioLayout', () => {
  it('renders the studio structure without a discussion', () => {
    render(
      <MemoryRouter initialEntries={['/discussions']}>
        <StudioLayout />
      </MemoryRouter>
    )

    expect(screen.getByText('AI Panel Studio')).toBeInTheDocument()
    expect(screen.getByText('从左侧选择讨论，或发起新的圆桌会议')).toBeInTheDocument()
  })

  it('renders discussion list in sidebar', () => {
    render(
      <MemoryRouter initialEntries={['/discussions']}>
        <StudioLayout />
      </MemoryRouter>
    )

    expect(screen.getByText('讨论列表')).toBeInTheDocument()
  })

  it('shows empty discussion placeholder when not in a room', () => {
    render(
      <MemoryRouter initialEntries={['/discussions']}>
        <StudioLayout />
      </MemoryRouter>
    )

    expect(screen.getByText('🎙️')).toBeInTheDocument()
  })

  it('renders CreateDiscussionModal when createModalOpen is true', () => {
    act(() => {
      useAppStore.setState({ createModalOpen: true })
    })

    render(
      <MemoryRouter initialEntries={['/discussions']}>
        <StudioLayout />
      </MemoryRouter>
    )

    expect(screen.getByText('发起新讨论')).toBeInTheDocument()
  })

  it('does not render CreateDiscussionModal when createModalOpen is false', () => {
    render(
      <MemoryRouter initialEntries={['/discussions']}>
        <StudioLayout />
      </MemoryRouter>
    )

    expect(screen.queryByText('发起新讨论')).not.toBeInTheDocument()
  })
})
