import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { act } from '@testing-library/react'
import { useDiscussionStore } from '../../../stores/discussionStore'
import { DiscussionRoom } from '../../../components/discussion/DiscussionRoom'

beforeEach(() => {
  vi.restoreAllMocks()
  vi.stubGlobal('EventSource', vi.fn(() => ({
    addEventListener: vi.fn(),
    close: vi.fn(),
  })))
  vi.stubGlobal('fetch', vi.fn())
  act(() => {
    useDiscussionStore.setState({
      discussion: null,
      panelists: [],
      loading: false,
      messages: [],
      consensusPoints: [],
      divergencePoints: [],
      systemSummary: null,
      eventSource: null,
    })
  })
})

function renderRoom(id = 'd1') {
  // Set route params
  window.history.pushState({}, '', `/discussions/${id}`)
  return render(
    <MemoryRouter initialEntries={[`/discussions/${id}`]}>
      <DiscussionRoom />
    </MemoryRouter>
  )
}

describe('DiscussionRoom', () => {
  it('shows loading state when loading or discussion is null', () => {
    act(() => { useDiscussionStore.setState({ loading: true, discussion: null }) })
    renderRoom()
    expect(screen.getByText('加载讨论中...')).toBeInTheDocument()
  })

  it('shows discussion topic in header when loaded', () => {
    act(() => {
      useDiscussionStore.setState({
        loading: false,
        discussion: {
          id: 'd1',
          topic: 'AI 监管的未来',
          expert_count: 3,
          status: 'live',
          created_at: '2025-01-01T00:00:00Z',
          pinned_at: null,
        },
      })
    })
    renderRoom()
    expect(screen.getByText('AI 监管的未来')).toBeInTheDocument()
  })

  it('shows empty transcript placeholder via TranscriptView', () => {
    act(() => {
      useDiscussionStore.setState({
        loading: false,
        discussion: {
          id: 'd1',
          topic: 'Test',
          expert_count: 3,
          status: 'live',
          created_at: '',
          pinned_at: null,
        },
        messages: [],
      })
    })
    renderRoom()
    expect(screen.getByText('等待主持人开场...')).toBeInTheDocument()
  })

  it('renders TranscriptView with messages', () => {
    act(() => {
      useDiscussionStore.setState({
        loading: false,
        discussion: {
          id: 'd1',
          topic: 'Test',
          expert_count: 3,
          status: 'live',
          created_at: '',
          pinned_at: null,
        },
        messages: [
          {
            id: 'm1',
            discussion_id: 'd1',
            panelist_id: 'p1',
            name: '主持人',
            title: '主持',
            color: '#00e5ff',
            content: '欢迎来到今天的讨论！',
            type: 'opening',
            seq: 1,
            created_at: '2025-01-01T00:00:00Z',
          },
        ],
      })
    })
    renderRoom()
    expect(screen.getByText('欢迎来到今天的讨论！')).toBeInTheDocument()
    expect(screen.getByText('开场')).toBeInTheDocument()
  })
})
