// ===== 核心数据模型 =====

export type DiscussionStatus = 'pending' | 'live' | 'ended'
export type PanelistRole = 'host' | 'expert'
export type PanelistStatus = 'standby' | 'preparing' | 'speaking'
export type MessageType = 'opening' | 'statement' | 'rebuttal' | 'supplement' | 'closing'

export interface Discussion {
  id: string
  topic: string
  expert_count: number
  status: DiscussionStatus
  created_at: string
  pinned_at: string | null
}

export interface DiscussionSummary extends Discussion {
  panelist_count: number
  message_count: number
}

export interface Panelist {
  id: string
  discussion_id: string
  name: string
  role: PanelistRole
  title: string
  stance: string
  color: string
  status: PanelistStatus
  focus: string
}

export interface Message {
  id: string
  discussion_id: string
  panelist_id: string
  name: string
  title: string
  color: string
  content: string
  type: MessageType
  seq: number
  created_at: string
}

export interface ConsensusPoint {
  id: string
  discussion_id: string
  content: string
  confidence: number
  updated_at: string
}

export interface DivergencePoint {
  id: string
  discussion_id: string
  content: string
  perspectives: string[]
  updated_at: string
}

// ===== SSE 事件类型 =====

export type SSEEventType =
  | 'panelist_status'
  | 'transcript_message'
  | 'message_token'
  | 'consensus_update'
  | 'divergence_update'
  | 'discussion_end'

export interface PanelistStatusEvent {
  panelist_id: string
  status: PanelistStatus
  focus: string
}

export interface DiscussionEndEvent {
  summary: string
}

export interface MessageTokenEvent {
  panelist_id: string
  token: string
  seq: number
}
