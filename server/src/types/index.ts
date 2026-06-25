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
  perspectives: string // SQLite stores JSON string
  updated_at: string
}

// ===== LLM Client =====

export interface LLMClient {
  chat(messages: { role: string; content: string }[]): Promise<string>
}

// ===== Business Input/Output Types =====

export interface GeneratePanelistsInput {
  topic: string
  expert_count: number
}

export interface GeneratedPanelist {
  name: string
  role: PanelistRole
  title: string
  stance: string
  color: string
}

export interface SchedulingContext {
  topic: string
  messages: { panelist_id: string; name: string; content: string; type: MessageType }[]
  panelists: { id: string; name: string; role: PanelistRole; status: PanelistStatus }[]
}

export interface ConsensusInput {
  topic: string
  recentMessages: { panelist_id: string; name: string; content: string }[]
  existingConsensus: { id: string; content: string; confidence: number }[]
  existingDivergence: { id: string; content: string; perspectives: string[] }[]
}

export interface SchedulingDecision {
  panelist_id: string
  type: MessageType
  content: string
}
