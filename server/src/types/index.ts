// Re-export shared base types
import type {
  DiscussionStatus,
  PanelistRole,
  PanelistStatus,
  MessageType,
  DiscussionRow,
  PanelistRow,
  MessageRow,
  ConsensusRow,
  DivergenceRow,
} from '../../../shared/types.js'

export type {
  DiscussionStatus,
  PanelistRole,
  PanelistStatus,
  MessageType,
  DiscussionRow,
  PanelistRow,
  MessageRow,
  ConsensusRow,
  DivergenceRow,
}

// ===== Server-specific types =====

export interface LLMClient {
  chat(messages: { role: string; content: string }[]): Promise<string>
  streamChat(messages: { role: string; content: string }[]): AsyncGenerator<string>
}

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
  panelists: { id: string; name: string; role: PanelistRole; title: string; stance: string; status: PanelistStatus }[]
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
}
