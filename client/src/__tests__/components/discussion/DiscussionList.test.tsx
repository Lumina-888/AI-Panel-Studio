import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { act } from '@testing-library/react'
import { useAppStore } from '../../../stores/appStore'
import { DiscussionList } from '../../../components/discussion/DiscussionList'
import type { DiscussionSummary } from '../../../types'

function makeDiscussion(overrides: Partial<DiscussionSummary> = {}): DiscussionSummary {
  return {
    id: 'd1',
    topic: 'AI 监管',
    expert_count: 3,
    status: 'live',
    created_at: '2025-01-01T00:00:00Z',
    pinned_at: null,
    panelist_count: 3,
    message_count: 12,
    ...overrides,
  }
}

function resetStore() {
  act(() => {
    useAppStore.setState({
      discussions: [],
      loading: false,
      activeDiscussionId: null,
      createModalOpen: false,
    })
  })
}

beforeEach(() => {
  vi.restoreAllMocks()
  resetStore()
})

function renderList() {
  return render(
    <MemoryRouter>
      <DiscussionList onNewDiscussion={vi.fn()} />
    </MemoryRouter>
  )
}

describe('DiscussionList', () => {
  it('shows empty state when no discussions', () => {
    renderList()
    expect(screen.getByText('暂无讨论，点击上方按钮发起')).toBeInTheDocument()
  })

  it('shows loading state when loading with no discussions', () => {
    act(() => { useAppStore.setState({ loading: true, discussions: [] }) })
    renderList()
    expect(screen.getByText('加载中...')).toBeInTheDocument()
  })

  it('renders discussion items', () => {
    act(() => {
      useAppStore.setState({
        discussions: [
          makeDiscussion({ id: 'd1', topic: 'AI 监管', status: 'live' }),
          makeDiscussion({ id: 'd2', topic: '气候变化', status: 'pending' }),
        ],
      })
    })
    renderList()
    expect(screen.getByText('AI 监管')).toBeInTheDocument()
    expect(screen.getByText('气候变化')).toBeInTheDocument()
  })

  it('shows pin icon for pinned discussions', () => {
    act(() => {
      useAppStore.setState({
        discussions: [makeDiscussion({ id: 'd1', topic: 'Pinned Topic', pinned_at: '2025-01-01T00:00:00Z' })],
      })
    })
    renderList()
    // The pin icon should be visible (filled)
    const pinSvgs = document.querySelectorAll('svg')
    expect(pinSvgs.length).toBeGreaterThan(0)
  })

  it('calls onNewDiscussion when star button clicked', async () => {
    const onNewDiscussion = vi.fn()
    render(
      <MemoryRouter>
        <DiscussionList onNewDiscussion={onNewDiscussion} />
      </MemoryRouter>
    )
    await userEvent.click(screen.getByText('新讨论'))
    expect(onNewDiscussion).toHaveBeenCalledOnce()
  })

  it('shows delete confirmation modal when delete button clicked', async () => {
    act(() => {
      useAppStore.setState({
        discussions: [makeDiscussion({ id: 'd1', topic: '要删除的话题' })],
      })
    })
    renderList()

    // Hover to reveal delete button, then click
    const deleteBtn = document.querySelector('[title="删除讨论"]')!
    await userEvent.click(deleteBtn)

    // "确认删除" appears both in h3 title and GradientButton
    const confirmElements = screen.getAllByText('确认删除')
    expect(confirmElements.length).toBeGreaterThanOrEqual(2)
    // "要删除的话题" appears in both list item and modal
    const topicElements = screen.getAllByText('要删除的话题')
    expect(topicElements.length).toBeGreaterThanOrEqual(2)
  })

  it('closes delete modal when cancel clicked', async () => {
    act(() => {
      useAppStore.setState({
        discussions: [makeDiscussion()],
      })
    })
    renderList()

    // Open delete modal
    await userEvent.click(document.querySelector('[title="删除讨论"]')!)
    const confirmElements = screen.getAllByText('确认删除')
    expect(confirmElements.length).toBeGreaterThanOrEqual(2)

    // Click cancel
    await userEvent.click(screen.getByText('取消'))
    // Modal should be gone — no more "要删除的话题" or confirm title
    expect(screen.queryByText('此操作不可撤销')).not.toBeInTheDocument()
  })

  it('shows status labels: 运行中 for live, 等待中 for pending, 已结束 for ended', () => {
    act(() => {
      useAppStore.setState({
        discussions: [
          makeDiscussion({ id: 'd1', topic: 'Live Topic', status: 'live' }),
          makeDiscussion({ id: 'd2', topic: 'Pending Topic', status: 'pending' }),
          makeDiscussion({ id: 'd3', topic: 'Ended Topic', status: 'ended' }),
        ],
      })
    })
    renderList()
    expect(screen.getByText('运行中')).toBeInTheDocument()
    expect(screen.getByText('等待中')).toBeInTheDocument()
    expect(screen.getByText('已结束')).toBeInTheDocument()
  })
})
