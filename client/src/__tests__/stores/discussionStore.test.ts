import { describe, it, expect, vi, beforeEach } from 'vitest'
import { act } from '@testing-library/react'
import { useDiscussionStore } from '../../stores/discussionStore'
import type { Message, Panelist, ConsensusPoint, DivergencePoint, PanelistStatusEvent, SystemSummaryEvent } from '../../types'

// ---- test helpers ----

function resetStore() {
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
}

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
    focus: '思考中...',
    ...overrides,
  }
}

function makeMessage(overrides: Partial<Message> = {}): Message {
  return {
    id: 'm1',
    discussion_id: 'd1',
    panelist_id: 'p1',
    name: '张教授',
    title: 'AI 研究员',
    color: '#e040fb',
    content: '我认为需要加强监管。',
    type: 'statement',
    seq: 1,
    created_at: '2025-01-01T00:00:00Z',
    ...overrides,
  }
}

beforeEach(() => {
  vi.restoreAllMocks()
  resetStore()
  // Stub fetch with a valid response so un-awaited fetchDiscussions() calls don't throw
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ json: () => Promise.resolve([]) }))
})

// ===== 初始状态 =====

describe('discussionStore — initial state', () => {
  it('discussion is null', () => {
    expect(useDiscussionStore.getState().discussion).toBeNull()
  })

  it('panelists is empty array', () => {
    expect(useDiscussionStore.getState().panelists).toEqual([])
  })

  it('messages is empty array', () => {
    expect(useDiscussionStore.getState().messages).toEqual([])
  })

  it('consensusPoints and divergencePoints are empty', () => {
    expect(useDiscussionStore.getState().consensusPoints).toEqual([])
    expect(useDiscussionStore.getState().divergencePoints).toEqual([])
  })

  it('systemSummary is null', () => {
    expect(useDiscussionStore.getState().systemSummary).toBeNull()
  })

  it('eventSource is null', () => {
    expect(useDiscussionStore.getState().eventSource).toBeNull()
  })

  it('loading is false', () => {
    expect(useDiscussionStore.getState().loading).toBe(false)
  })
})

// ===== fetchDiscussion =====

describe('discussionStore — fetchDiscussion', () => {
  it('populates discussion, panelists, messages, consensus, divergence from API', async () => {
    const mockApiData = {
      id: 'd1',
      topic: 'AI 监管',
      expert_count: 3,
      status: 'live',
      created_at: '2025-01-01T00:00:00Z',
      pinned_at: null,
      panelists: [makePanelist()],
      messages: [makeMessage()],
      consensus: [{ id: 'c1', discussion_id: 'd1', content: '大家都同意监管必要', confidence: 0.9, updated_at: '2025-01-01T00:00:00Z' }],
      divergence: [{ id: 'dv1', discussion_id: 'd1', content: '分歧在监管力度', perspectives: ['严格', '宽松'], updated_at: '2025-01-01T00:00:00Z' }],
    }

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValueOnce({ json: () => Promise.resolve(mockApiData) })
    )

    await act(async () => {
      await useDiscussionStore.getState().fetchDiscussion('d1')
    })

    const s = useDiscussionStore.getState()
    expect(s.loading).toBe(false)
    expect(s.discussion).toMatchObject({ id: 'd1', topic: 'AI 监管', status: 'live' })
    expect(s.panelists).toHaveLength(1)
    expect(s.messages).toHaveLength(1)
    expect(s.consensusPoints).toHaveLength(1)
    expect(s.divergencePoints).toHaveLength(1)
  })

  it('handles missing optional fields gracefully', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValueOnce({
        json: () => Promise.resolve({
          id: 'd2',
          topic: 'Climate',
          expert_count: 2,
          status: 'pending',
          created_at: '',
        }),
      })
    )

    await act(async () => {
      await useDiscussionStore.getState().fetchDiscussion('d2')
    })

    const s = useDiscussionStore.getState()
    expect(s.panelists).toEqual([])
    expect(s.messages).toEqual([])
    expect(s.consensusPoints).toEqual([])
    expect(s.divergencePoints).toEqual([])
  })

  it('sets loading false on fetch error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValueOnce(new Error('Server down'))
    )

    await act(async () => {
      try {
        await useDiscussionStore.getState().fetchDiscussion('d1')
      } catch {
        // expected
      }
    })

    expect(useDiscussionStore.getState().loading).toBe(false)
  })
})

// ===== SSE connect / disconnect =====

describe('discussionStore — SSE', () => {
  it('connectSSE creates an EventSource and stores it', () => {
    const mockES = {
      addEventListener: vi.fn(),
      close: vi.fn(),
    }
    // Use a class-like mock that works with `new`
    vi.stubGlobal('EventSource', vi.fn().mockImplementation(function (this: any) {
      Object.assign(this, mockES)
    }))

    act(() => {
      useDiscussionStore.getState().connectSSE('d1')
    })

    const stored = useDiscussionStore.getState().eventSource
    expect(stored).toBeTruthy()
    expect(stored!.addEventListener).toBe(mockES.addEventListener)
    // Should register 7 event listeners
    expect(mockES.addEventListener).toHaveBeenCalledTimes(7)
  })

  it('connectSSE closes existing EventSource before creating new', () => {
    const oldClose = vi.fn()
    const oldES = { addEventListener: vi.fn(), close: oldClose }
    useDiscussionStore.setState({ eventSource: oldES as any })

    const newMock = { addEventListener: vi.fn(), close: vi.fn() }
    vi.stubGlobal('EventSource', vi.fn().mockImplementation(function (this: any) {
      Object.assign(this, newMock)
    }))

    act(() => {
      useDiscussionStore.getState().connectSSE('d2')
    })

    expect(oldClose).toHaveBeenCalledOnce()
    const stored = useDiscussionStore.getState().eventSource
    expect(stored?.addEventListener).toBe(newMock.addEventListener)
  })

  it('disconnectSSE closes and nulls eventSource', () => {
    const close = vi.fn()
    useDiscussionStore.setState({ eventSource: { close } as any })

    act(() => {
      useDiscussionStore.getState().disconnectSSE()
    })

    expect(close).toHaveBeenCalledOnce()
    expect(useDiscussionStore.getState().eventSource).toBeNull()
  })

  it('disconnectSSE is no-op when eventSource is null', () => {
    useDiscussionStore.setState({ eventSource: null })
    act(() => {
      useDiscussionStore.getState().disconnectSSE()
    })
    // Should not throw
  })
})

// ===== addMessage =====

describe('discussionStore — addMessage', () => {
  it('adds a new message sorted by seq', () => {
    useDiscussionStore.setState({
      messages: [{ ...makeMessage({ id: 'm1', seq: 1 }) }],
    })

    act(() => {
      useDiscussionStore.getState().addMessage(makeMessage({ id: 'm2', seq: 0 }))
    })

    const msgs = useDiscussionStore.getState().messages
    expect(msgs).toHaveLength(2)
    expect(msgs[0].seq).toBe(0)
    expect(msgs[1].seq).toBe(1)
  })

  it('deduplicates by id — does not add duplicate', () => {
    const msg = makeMessage({ id: 'm1', seq: 1 })
    useDiscussionStore.setState({ messages: [msg] })

    act(() => {
      useDiscussionStore.getState().addMessage({ ...msg })
    })

    expect(useDiscussionStore.getState().messages).toHaveLength(1)
  })

  it('replaces streaming placeholder with same seq', () => {
    const placeholder: Message = makeMessage({ id: 'streaming-3', seq: 3, content: 'partial...' })
    useDiscussionStore.setState({ messages: [placeholder] })

    const final: Message = makeMessage({ id: 'real-m3', seq: 3, content: 'complete text' })

    act(() => {
      useDiscussionStore.getState().addMessage(final)
    })

    const msgs = useDiscussionStore.getState().messages
    expect(msgs).toHaveLength(1)
    expect(msgs[0].id).toBe('real-m3')
    expect(msgs[0].content).toBe('complete text')
  })
})

// ===== appendMessageToken =====

describe('discussionStore — appendMessageToken', () => {
  it('creates streaming placeholder when no message with that seq exists', () => {
    useDiscussionStore.setState({
      discussion: { id: 'd1', topic: 'T', expert_count: 2, status: 'live', created_at: '', pinned_at: null },
      panelists: [makePanelist()],
    })

    act(() => {
      useDiscussionStore.getState().appendMessageToken('p1', '你好', 1)
    })

    const msgs = useDiscussionStore.getState().messages
    expect(msgs).toHaveLength(1)
    expect(msgs[0].id).toBe('streaming-1')
    expect(msgs[0].content).toBe('你好')
    expect(msgs[0].panelist_id).toBe('p1')
  })

  it('appends token to existing streaming placeholder', () => {
    const placeholder: Message = makeMessage({ id: 'streaming-2', seq: 2, content: '第一句' })
    useDiscussionStore.setState({ messages: [placeholder] })

    act(() => {
      useDiscussionStore.getState().appendMessageToken('p1', '，接着说', 2)
    })

    const msgs = useDiscussionStore.getState().messages
    expect(msgs).toHaveLength(1)
    expect(msgs[0].content).toBe('第一句，接着说')
  })

  it('appends token to regular message with matching seq', () => {
    const msg = makeMessage({ id: 'm1', seq: 5, content: 'Hello' })
    useDiscussionStore.setState({ messages: [msg] })

    act(() => {
      useDiscussionStore.getState().appendMessageToken('p1', ' World', 5)
    })

    expect(useDiscussionStore.getState().messages[0].content).toBe('Hello World')
  })

  it('falls back to #888888 color when panelist not found', () => {
    useDiscussionStore.setState({
      discussion: { id: 'd1', topic: 'T', expert_count: 2, status: 'live', created_at: '', pinned_at: null },
      panelists: [],
    })

    act(() => {
      useDiscussionStore.getState().appendMessageToken('unknown_panelist', 'text', 1)
    })

    const msg = useDiscussionStore.getState().messages[0]
    expect(msg.color).toBe('#888888')
  })
})

// ===== updatePanelistStatus =====

describe('discussionStore — updatePanelistStatus', () => {
  it('updates status and focus of matching panelist', () => {
    useDiscussionStore.setState({
      panelists: [makePanelist({ id: 'p1', status: 'standby', focus: '思考中...' })],
    })

    act(() => {
      useDiscussionStore.getState().updatePanelistStatus({
        panelist_id: 'p1',
        status: 'speaking',
        focus: '阐述核心观点',
      })
    })

    const p = useDiscussionStore.getState().panelists[0]
    expect(p.status).toBe('speaking')
    expect(p.focus).toBe('阐述核心观点')
  })

  it('ignores non-matching panelist_id', () => {
    useDiscussionStore.setState({
      panelists: [makePanelist({ id: 'p1', status: 'standby', focus: '等待中' })],
    })

    act(() => {
      useDiscussionStore.getState().updatePanelistStatus({
        panelist_id: 'p99',
        status: 'speaking',
        focus: 'something',
      })
    })

    expect(useDiscussionStore.getState().panelists[0].status).toBe('standby')
  })
})

// ===== upsertConsensus / upsertDivergence =====

describe('discussionStore — upsertConsensus', () => {
  it('adds new consensus point', () => {
    const point: ConsensusPoint = {
      id: 'c1',
      discussion_id: 'd1',
      content: '共识：AI需要监管',
      confidence: 0.85,
      updated_at: '2025-01-01T00:00:00Z',
    }

    act(() => {
      useDiscussionStore.getState().upsertConsensus(point)
    })

    expect(useDiscussionStore.getState().consensusPoints).toHaveLength(1)
    expect(useDiscussionStore.getState().consensusPoints[0].id).toBe('c1')
  })

  it('updates existing consensus point by id', () => {
    const old: ConsensusPoint = { id: 'c1', discussion_id: 'd1', content: '老共识', confidence: 0.5, updated_at: '' }
    useDiscussionStore.setState({ consensusPoints: [old] })

    const updated: ConsensusPoint = { id: 'c1', discussion_id: 'd1', content: '更新共识', confidence: 0.9, updated_at: '2025-01-02T00:00:00Z' }

    act(() => {
      useDiscussionStore.getState().upsertConsensus(updated)
    })

    expect(useDiscussionStore.getState().consensusPoints).toHaveLength(1)
    expect(useDiscussionStore.getState().consensusPoints[0].content).toBe('更新共识')
    expect(useDiscussionStore.getState().consensusPoints[0].confidence).toBe(0.9)
  })
})

describe('discussionStore — upsertDivergence', () => {
  it('adds new divergence point', () => {
    const point: DivergencePoint = {
      id: 'dv1',
      discussion_id: 'd1',
      content: '分歧：监管松 vs 严',
      perspectives: ['松', '严'],
      updated_at: '2025-01-01T00:00:00Z',
    }

    act(() => {
      useDiscussionStore.getState().upsertDivergence(point)
    })

    expect(useDiscussionStore.getState().divergencePoints).toHaveLength(1)
    expect(useDiscussionStore.getState().divergencePoints[0].perspectives).toEqual(['松', '严'])
  })

  it('updates existing divergence point by id', () => {
    const old: DivergencePoint = { id: 'dv1', discussion_id: 'd1', content: '旧分歧', perspectives: ['A'], updated_at: '' }
    useDiscussionStore.setState({ divergencePoints: [old] })

    const updated: DivergencePoint = { id: 'dv1', discussion_id: 'd1', content: '新分歧', perspectives: ['A', 'B', 'C'], updated_at: 'now' }

    act(() => {
      useDiscussionStore.getState().upsertDivergence(updated)
    })

    expect(useDiscussionStore.getState().divergencePoints).toHaveLength(1)
    expect(useDiscussionStore.getState().divergencePoints[0].content).toBe('新分歧')
    expect(useDiscussionStore.getState().divergencePoints[0].perspectives).toHaveLength(3)
  })
})

// ===== setSystemSummary =====

describe('discussionStore — setSystemSummary', () => {
  it('sets systemSummary', () => {
    const summary: SystemSummaryEvent = {
      content: '当前讨论已过半，各方观点趋于清晰。',
      consensus: [{ id: 'c1', discussion_id: 'd1', content: '共识', confidence: 0.8, updated_at: '' }],
      divergence: [{ id: 'dv1', discussion_id: 'd1', content: '分歧', perspectives: ['A'], updated_at: '' }],
    }

    act(() => {
      useDiscussionStore.getState().setSystemSummary(summary)
    })

    expect(useDiscussionStore.getState().systemSummary).toEqual(summary)
  })
})

// ===== endDiscussion =====

describe('discussionStore — endDiscussion', () => {
  it('sets discussion status to ended and adds closing message', () => {
    useDiscussionStore.setState({
      discussion: { id: 'd1', topic: 'T', expert_count: 2, status: 'live', created_at: '', pinned_at: null },
      messages: [makeMessage({ id: 'm1', seq: 3 })],
    })

    act(() => {
      useDiscussionStore.getState().endDiscussion('本次讨论圆满结束。')
    })

    const s = useDiscussionStore.getState()
    expect(s.discussion!.status).toBe('ended')
    expect(s.messages).toHaveLength(2)
    const closing = s.messages[s.messages.length - 1]
    expect(closing.type).toBe('closing')
    expect(closing.content).toBe('本次讨论圆满结束。')
    expect(closing.panelist_id).toBe('summary')
    expect(closing.name).toBe('系统')
  })

  it('uses seq=1 for closing when messages was empty', () => {
    useDiscussionStore.setState({
      discussion: { id: 'd2', topic: 'T', expert_count: 2, status: 'live', created_at: '', pinned_at: null },
      messages: [],
    })

    act(() => {
      useDiscussionStore.getState().endDiscussion('总结。')
    })

    expect(useDiscussionStore.getState().messages[0].seq).toBe(1)
  })
})

// ===== reset =====

describe('discussionStore — reset', () => {
  it('disconnects SSE and resets all state to initial', () => {
    const close = vi.fn()
    useDiscussionStore.setState({
      discussion: { id: 'd1', topic: 'T', expert_count: 2, status: 'live', created_at: '', pinned_at: null },
      panelists: [makePanelist()],
      messages: [makeMessage()],
      consensusPoints: [{ id: 'c1', discussion_id: 'd1', content: 'C', confidence: 0.5, updated_at: '' }],
      eventSource: { close, addEventListener: vi.fn() } as any,
      systemSummary: { content: 'S', consensus: [], divergence: [] },
    })

    act(() => {
      useDiscussionStore.getState().reset()
    })

    const s = useDiscussionStore.getState()
    expect(close).toHaveBeenCalledOnce()
    expect(s.discussion).toBeNull()
    expect(s.messages).toEqual([])
    expect(s.panelists).toEqual([])
    expect(s.consensusPoints).toEqual([])
    expect(s.divergencePoints).toEqual([])
    expect(s.systemSummary).toBeNull()
    expect(s.eventSource).toBeNull()
  })
})
