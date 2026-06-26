import { create } from 'zustand'
import type { DiscussionSummary } from '../types'

interface AppState {
  // 讨论列表
  discussions: DiscussionSummary[]
  loading: boolean
  fetchDiscussions: () => Promise<void>

  // 当前活跃讨论
  activeDiscussionId: string | null
  setActiveDiscussion: (id: string | null) => void

  // 创建讨论弹窗
  createModalOpen: boolean
  openCreateModal: () => void
  closeCreateModal: () => void

  // 删除 & 置顶
  deleteDiscussion: (id: string) => Promise<void>
  togglePin: (id: string, pinned: boolean) => Promise<void>
}

export const useAppStore = create<AppState>((set, get) => ({
  discussions: [],
  loading: false,

  fetchDiscussions: async () => {
    set({ loading: true })
    try {
      const res = await fetch('/api/discussions')
      const data = await res.json()
      const list = Array.isArray(data) ? data : (data.discussions || [])
      const discussions = list.map((d: any) => ({
        id: d.id,
        topic: d.topic,
        expert_count: d.expert_count,
        status: d.status,
        created_at: d.created_at,
        panelist_count: d.panelists?.length ?? 0,
        message_count: d.messages?.length ?? 0,
        pinned_at: d.pinned_at ?? null,
      }))
      set({ discussions, loading: false })
    } finally {
      set({ loading: false })
    }
  },

  activeDiscussionId: null,
  setActiveDiscussion: (id) => set({ activeDiscussionId: id }),

  createModalOpen: false,
  openCreateModal: () => set({ createModalOpen: true }),
  closeCreateModal: () => set({ createModalOpen: false }),

  deleteDiscussion: async (id) => {
    await fetch(`/api/discussions/${id}`, { method: 'DELETE' })
    set((s) => ({
      discussions: s.discussions.filter(d => d.id !== id),
      activeDiscussionId: s.activeDiscussionId === id ? null : s.activeDiscussionId,
    }))
  },

  togglePin: async (id, pinned) => {
    await fetch(`/api/discussions/${id}/pin`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pinned }),
    })
    // Re-fetch list for correct sort order
    await get().fetchDiscussions()
  },
}))
