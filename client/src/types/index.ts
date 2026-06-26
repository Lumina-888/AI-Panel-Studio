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
} from '../../../shared/types'

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

// ===== Client-specific types =====

/** Discussion as used by client */
export type Discussion = DiscussionRow

export interface DiscussionSummary extends Discussion {
  panelist_count: number
  message_count: number
}

/** Panelist as used by client — matches DB schema (focus is nullable) */
export type Panelist = PanelistRow

/** Enriched message with panelist display info */
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

/** Consensus point */
export type ConsensusPoint = ConsensusRow

/** Divergence point with parsed perspectives array */
export interface DivergencePoint {
  id: string
  discussion_id: string
  content: string
  perspectives: string[]
  updated_at: string
}

// ===== SSE event types =====

export type SSEEventType =
  | 'panelist_status'
  | 'transcript_message'
  | 'message_token'
  | 'consensus_update'
  | 'divergence_update'
  | 'discussion_end'
  | 'system_summary'

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

export interface SystemSummaryEvent {
  content: string
  consensus: ConsensusPoint[]
  divergence: DivergencePoint[]
}
