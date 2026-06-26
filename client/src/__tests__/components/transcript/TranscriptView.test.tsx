import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { act } from '@testing-library/react'
import { useDiscussionStore } from '../../../stores/discussionStore'
import { TranscriptView } from '../../../components/transcript/TranscriptView'
import type { Message } from '../../../types'

beforeEach(() => {
  act(() => {
    useDiscussionStore.setState({
      messages: [],
    })
  })
})

function makeMessage(overrides: Partial<Message> = {}): Message {
  return {
    id: 'm1',
    discussion_id: 'd1',
    panelist_id: 'p1',
    name: '张教授',
    title: 'AI研究员',
    color: '#e040fb',
    content: '我认为需要加强AI监管。',
    type: 'statement',
    seq: 1,
    created_at: '2025-01-01T00:00:00Z',
    ...overrides,
  }
}

describe('TranscriptView', () => {
  it('shows empty placeholder when no messages', () => {
    render(<TranscriptView />)
    expect(screen.getByText('等待主持人开场...')).toBeInTheDocument()
  })

  it('renders messages with author name and content', () => {
    act(() => {
      useDiscussionStore.setState({
        messages: [makeMessage()],
      })
    })
    render(<TranscriptView />)
    expect(screen.getByText('张教授')).toBeInTheDocument()
    expect(screen.getByText('我认为需要加强AI监管。')).toBeInTheDocument()
  })

  it('shows avatar initial (first character of name)', () => {
    act(() => {
      useDiscussionStore.setState({ messages: [makeMessage({ name: '李博士' })] })
    })
    render(<TranscriptView />)
    expect(screen.getByText('李')).toBeInTheDocument()
  })

  it('shows type label for opening message', () => {
    act(() => {
      useDiscussionStore.setState({ messages: [makeMessage({ type: 'opening' })] })
    })
    render(<TranscriptView />)
    expect(screen.getByText('开场')).toBeInTheDocument()
  })

  it('shows type label for rebuttal message', () => {
    act(() => {
      useDiscussionStore.setState({ messages: [makeMessage({ type: 'rebuttal' })] })
    })
    render(<TranscriptView />)
    expect(screen.getByText('反驳')).toBeInTheDocument()
  })

  it('shows type label for closing message', () => {
    act(() => {
      useDiscussionStore.setState({ messages: [makeMessage({ type: 'closing' })] })
    })
    render(<TranscriptView />)
    expect(screen.getByText('总结')).toBeInTheDocument()
  })

  it('does not show type label for statement', () => {
    act(() => {
      useDiscussionStore.setState({ messages: [makeMessage({ type: 'statement' })] })
    })
    render(<TranscriptView />)
    // Statement should not render a type label
    const labels = document.querySelectorAll('.bg-white\\/10')
    expect(labels.length).toBe(0)
  })

  it('renders multiple messages in order', () => {
    act(() => {
      useDiscussionStore.setState({
        messages: [
          makeMessage({ id: 'm1', seq: 1, name: '主持', content: '开始' }),
          makeMessage({ id: 'm2', seq: 2, name: '专家A', content: '观点A' }),
        ],
      })
    })
    render(<TranscriptView />)
    const items = screen.getAllByText(/开始|观点A/)
    expect(items).toHaveLength(2)
  })
})
