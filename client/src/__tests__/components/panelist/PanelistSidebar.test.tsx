import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { act } from '@testing-library/react'
import { useDiscussionStore } from '../../../stores/discussionStore'
import { PanelistSidebar } from '../../../components/panelist/PanelistSidebar'
import type { Panelist } from '../../../types'

function makePanelist(overrides: Partial<Panelist> = {}): Panelist {
  return {
    id: 'p1',
    discussion_id: 'd1',
    name: '张教授',
    role: 'expert',
    title: 'AI 研究员',
    stance: '支持 AI 监管',
    color: '#e040fb',
    status: 'standby',
    focus: '正在思考监管框架...',
    ...overrides,
  }
}

beforeEach(() => {
  act(() => {
    useDiscussionStore.setState({
      panelists: [],
    })
  })
})

describe('PanelistSidebar', () => {
  it('shows "专家状态" header', () => {
    render(<PanelistSidebar discussionId="d1" />)
    expect(screen.getByText('专家状态')).toBeInTheDocument()
  })

  it('shows panelist count summary', () => {
    act(() => {
      useDiscussionStore.setState({
        panelists: [
          makePanelist({ id: 'host', role: 'host', name: '主持' }),
          makePanelist({ id: 'p1', role: 'expert', name: '张教授' }),
          makePanelist({ id: 'p2', role: 'expert', name: '李博士' }),
        ],
      })
    })
    render(<PanelistSidebar discussionId="d1" />)
    expect(screen.getByText(/3 位嘉宾 · 2 位专家/)).toBeInTheDocument()
  })

  it('renders each panelist with name and title', () => {
    act(() => {
      useDiscussionStore.setState({
        panelists: [makePanelist()],
      })
    })
    render(<PanelistSidebar discussionId="d1" />)
    expect(screen.getByText('张教授')).toBeInTheDocument()
    expect(screen.getByText('AI 研究员')).toBeInTheDocument()
  })

  it('shows "主持" badge for host role', () => {
    act(() => {
      useDiscussionStore.setState({
        panelists: [makePanelist({ role: 'host', name: '主持人' })],
      })
    })
    render(<PanelistSidebar discussionId="d1" />)
    expect(screen.getByText('主持')).toBeInTheDocument()
  })

  it('does not show "主持" badge for expert role', () => {
    act(() => {
      useDiscussionStore.setState({
        panelists: [makePanelist({ role: 'expert' })],
      })
    })
    render(<PanelistSidebar discussionId="d1" />)
    expect(screen.queryByText('主持')).not.toBeInTheDocument()
  })

  it('shows focus text for each panelist', () => {
    act(() => {
      useDiscussionStore.setState({
        panelists: [makePanelist({ focus: '正在思考监管框架...' })],
      })
    })
    render(<PanelistSidebar discussionId="d1" />)
    expect(screen.getByText(/正在思考监管框架.../)).toBeInTheDocument()
  })

  it('shows speaking status highlighted for speaking panelist', () => {
    act(() => {
      useDiscussionStore.setState({
        panelists: [makePanelist({ status: 'speaking' })],
      })
    })
    render(<PanelistSidebar discussionId="d1" />)
    expect(screen.getByText('发言中')).toBeInTheDocument()
  })

  it('shows standby status', () => {
    act(() => {
      useDiscussionStore.setState({
        panelists: [makePanelist({ status: 'standby' })],
      })
    })
    render(<PanelistSidebar discussionId="d1" />)
    expect(screen.getByText('待机')).toBeInTheDocument()
  })
})
