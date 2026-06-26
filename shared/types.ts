// ===== 前后端共享的基础类型 =====
// 枚举类型和数据库行类型以此为单一来源

// ===== 枚举类型 =====

export type DiscussionStatus = 'pending' | 'live' | 'ended'
export type PanelistRole = 'host' | 'expert'
export type PanelistStatus = 'standby' | 'preparing' | 'speaking'
export type MessageType = 'opening' | 'statement' | 'rebuttal' | 'supplement' | 'closing'

// ===== 数据库行类型 =====

export interface DiscussionRow {
  id: string
  topic: string
  expert_count: number
  status: DiscussionStatus
  created_at: string
  pinned_at: string | null
}

export interface PanelistRow {
  id: string
  discussion_id: string
  name: string
  role: PanelistRole
  title: string
  stance: string
  color: string
  status: PanelistStatus
  focus: string | null
}

export interface MessageRow {
  id: string
  discussion_id: string
  panelist_id: string
  content: string
  type: MessageType
  seq: number
  created_at: string
}

export interface ConsensusRow {
  id: string
  discussion_id: string
  content: string
  confidence: number
  updated_at: string
}

export interface DivergenceRow {
  id: string
  discussion_id: string
  content: string
  perspectives: string // SQLite 存储为 JSON 字符串
  updated_at: string
}
