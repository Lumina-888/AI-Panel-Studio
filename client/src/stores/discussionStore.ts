import { create } from 'zustand'
import type { Discussion, Panelist, Message, ConsensusPoint, DivergencePoint, SystemSummaryEvent } from '../types'
import type { PanelistStatusEvent } from '../types'
import { useAppStore } from './appStore'

interface DiscussionState {
  // 基础信息
  discussion: Discussion | null
  panelists: Panelist[]
  loading: boolean

  // 实时数据
  messages: Message[]
  consensusPoints: ConsensusPoint[]
  divergencePoints: DivergencePoint[]
  systemSummary: SystemSummaryEvent | null

  // SSE 连接
  eventSource: EventSource | null

  // 动作
  fetchDiscussion: (id: string) => Promise<void>
  connectSSE: (discussionId: string) => void
  disconnectSSE: () => void

  // 实时更新
  addMessage: (msg: Message) => void
  appendMessageToken: (panelist_id: string, token: string, seq: number) => void
  updatePanelistStatus: (e: PanelistStatusEvent) => void
  upsertConsensus: (point: ConsensusPoint) => void
  upsertDivergence: (point: DivergencePoint) => void
  setSystemSummary: (summary: SystemSummaryEvent) => void

  // 结束
  endDiscussion: (summary: string) => void
  reset: () => void
}

const initialState = {
  discussion: null,
  panelists: [],
  loading: false,
  messages: [],
  consensusPoints: [],
  divergencePoints: [],
  systemSummary: null,
  eventSource: null,
}

export const useDiscussionStore = create<DiscussionState>((set, get) => ({
  ...initialState,

  fetchDiscussion: async (id: string) => {
    set({ loading: true })
    try {
      const res = await fetch(`/api/discussions/${id}`)
      const data = await res.json()
      set({
        discussion: {
          id: data.id,
          topic: data.topic,
          expert_count: data.expert_count,
          status: data.status,
          created_at: data.created_at,
          pinned_at: data.pinned_at ?? null,
        },
        panelists: data.panelists || [],
        messages: data.messages || [],
        consensusPoints: data.consensus || [],
        divergencePoints: data.divergence || [],
        loading: false,
      })
    } catch {
      set({ loading: false })
    }
  },

  connectSSE: (discussionId: string) => {
    const existing = get().eventSource
    if (existing) existing.close()

    const es = new EventSource(`/api/discussions/${discussionId}/stream`)

    // 安全解析 SSE 事件数据，解析失败时静默返回 null
    const safeParse = <T>(e: MessageEvent): T | null => {
      try {
        return JSON.parse(e.data) as T
      } catch {
        console.warn('[SSE] JSON 解析失败:', e.type, (e as any).data?.slice?.(0, 100))
        return null
      }
    }

    es.addEventListener('panelist_status', (e) => {
      const data = safeParse<PanelistStatusEvent>(e)
      if (data) get().updatePanelistStatus(data)
    })

    es.addEventListener('message_token', (e) => {
      const data = safeParse<{ panelist_id: string; token: string; seq: number }>(e)
      if (data) get().appendMessageToken(data.panelist_id, data.token, data.seq)
    })

    es.addEventListener('transcript_message', (e) => {
      const msg = safeParse<Message>(e)
      if (msg) get().addMessage(msg)
    })

    es.addEventListener('consensus_update', (e) => {
      const point = safeParse<ConsensusPoint>(e)
      if (point) get().upsertConsensus(point)
    })

    es.addEventListener('divergence_update', (e) => {
      const point = safeParse<DivergencePoint>(e)
      if (point) get().upsertDivergence(point)
    })

    es.addEventListener('discussion_end', (e) => {
      const data = safeParse<{ summary: string }>(e)
      if (data) get().endDiscussion(data.summary)
    })

    es.addEventListener('system_summary', (e) => {
      const data = safeParse<SystemSummaryEvent>(e)
      if (data) get().setSystemSummary(data)
    })

    es.onerror = () => {
      console.warn('[SSE] 连接错误或服务端断开, discussion:', discussionId)
    }

    set({ eventSource: es })
  },

  disconnectSSE: () => {
    const es = get().eventSource
    if (es) {
      es.close()
      set({ eventSource: null })
    }
  },

  addMessage: (msg) =>
    set((s) => {
      // Dedup by id
      if (s.messages.some(m => m.id === msg.id)) return s
      // Replace streaming placeholder (same seq, streaming- prefix)
      const idxBySeq = s.messages.findIndex(m => m.seq === msg.seq && m.id.startsWith('streaming-'))
      if (idxBySeq >= 0) {
        const updated = [...s.messages]
        updated[idxBySeq] = msg
        return { messages: updated }
      }
      return { messages: [...s.messages, msg].sort((a, b) => a.seq - b.seq) }
    }),

  appendMessageToken: (panelist_id, token, seq) =>
    set((s) => {
      const idx = s.messages.findIndex(m => m.seq === seq)
      if (idx >= 0) {
        // Existing placeholder — append token
        const updated = [...s.messages]
        updated[idx] = { ...updated[idx], content: updated[idx].content + token }
        return { messages: updated }
      }
      // No placeholder yet — create one
      const placeholder: Message = {
        id: `streaming-${seq}`,
        discussion_id: s.discussion?.id ?? '',
        panelist_id,
        name: s.panelists.find(p => p.id === panelist_id)?.name ?? '',
        title: s.panelists.find(p => p.id === panelist_id)?.title ?? '',
        color: s.panelists.find(p => p.id === panelist_id)?.color ?? '#888888',
        content: token,
        type: 'statement',
        seq,
        created_at: new Date().toISOString(),
      }
      // Insert sorted by seq
      const inserted = [...s.messages, placeholder].sort((a, b) => a.seq - b.seq)
      return { messages: inserted }
    }),

  updatePanelistStatus: ({ panelist_id, status, focus }) =>
    set((s) => ({
      panelists: s.panelists.map((p) =>
        p.id === panelist_id ? { ...p, status, focus } : p
      ),
    })),

  upsertConsensus: (point) =>
    set((s) => {
      const idx = s.consensusPoints.findIndex((c) => c.id === point.id)
      if (idx >= 0) {
        const updated = [...s.consensusPoints]
        updated[idx] = point
        return { consensusPoints: updated }
      }
      return { consensusPoints: [...s.consensusPoints, point] }
    }),

  upsertDivergence: (point) =>
    set((s) => {
      const idx = s.divergencePoints.findIndex((d) => d.id === point.id)
      if (idx >= 0) {
        const updated = [...s.divergencePoints]
        updated[idx] = point
        return { divergencePoints: updated }
      }
      return { divergencePoints: [...s.divergencePoints, point] }
    }),

  setSystemSummary: (summary) =>
    set({ systemSummary: summary }),

  endDiscussion: (summary: string) => {
    // 同步刷新列表状态
    useAppStore.getState().fetchDiscussions()
    set((s) => ({
      discussion: s.discussion
        ? { ...s.discussion, status: 'ended' as const }
        : null,
      messages: [
        ...s.messages,
        {
          id: 'summary',
          discussion_id: s.discussion?.id ?? '',
          panelist_id: 'summary',
          name: '系统',
          title: '讨论总结',
          color: '#00e5ff',
          content: summary,
          type: 'closing',
          seq: (s.messages[s.messages.length - 1]?.seq ?? 0) + 1,
          created_at: new Date().toISOString(),
        } satisfies Message,
      ],
    }))
  },

  reset: () => {
    get().disconnectSSE()
    set(initialState)
  },
}))
