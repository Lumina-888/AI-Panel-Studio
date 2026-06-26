import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { act } from '@testing-library/react'
import { useAppStore } from '../../../stores/appStore'
import { HomeDiscussionPreview } from '../../../components/discussion/HomeDiscussionPreview'
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

beforeEach(() => {
  vi.restoreAllMocks()
  act(() => {
    useAppStore.setState({
      discussions: [],
      loading: false,
      activeDiscussionId: null,
      createModalOpen: false,
    })
  })
})

function renderPreview() {
  return render(
    <MemoryRouter>
      <HomeDiscussionPreview />
    </MemoryRouter>
  )
}

describe('HomeDiscussionPreview', () => {
  it('shows empty state when no discussions', () => {
    renderPreview()
    expect(screen.getByText('暂无讨论，去创建一个吧')).toBeInTheDocument()
  })

  it('shows loading spinner when loading with no discussions', () => {
    act(() => { useAppStore.setState({ loading: true }) })
    const { container } = renderPreview()
    // Should have a spinning element
    expect(container.querySelector('.animate-spin')).toBeInTheDocument()
  })

  it('renders discussion items', () => {
    act(() => {
      useAppStore.setState({
        discussions: [
          makeDiscussion({ id: 'd1', topic: 'AI 监管' }),
          makeDiscussion({ id: 'd2', topic: '气候变化' }),
        ],
      })
    })
    renderPreview()
    expect(screen.getByText('AI 监管')).toBeInTheDocument()
    expect(screen.getByText('气候变化')).toBeInTheDocument()
  })

  it('shows item index (01, 02...)', () => {
    act(() => {
      useAppStore.setState({
        discussions: [makeDiscussion(), makeDiscussion({ id: 'd2' })],
      })
    })
    renderPreview()
    expect(screen.getByText('01')).toBeInTheDocument()
    expect(screen.getByText('02')).toBeInTheDocument()
  })

  it('limits to 20 items', () => {
    const discussions = Array.from({ length: 25 }, (_, i) =>
      makeDiscussion({ id: `d${i}`, topic: `Topic ${i}` })
    )
    act(() => { useAppStore.setState({ discussions }) })
    const { container } = renderPreview()
    // Should only render 20 buttons
    const buttons = container.querySelectorAll('button')
    expect(buttons.length).toBeLessThanOrEqual(20)
  })
})
