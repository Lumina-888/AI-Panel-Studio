import { useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useDiscussionStore } from '../../stores/discussionStore'
import { TranscriptView } from '../transcript/TranscriptView'
import { ConsensusDivergencePanel } from '../consensus/ConsensusDivergencePanel'

export function DiscussionRoom() {
  const { id } = useParams<{ id: string }>()
  const { discussion, fetchDiscussion, connectSSE, disconnectSSE, reset, loading } =
    useDiscussionStore()

  useEffect(() => {
    if (!id) return
    reset()
    fetchDiscussion(id)
    connectSSE(id)
    return () => disconnectSSE()
  }, [id])

  if (loading || !discussion) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-text-dim">加载讨论中...</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* 顶栏 */}
      <header className="h-14 flex items-center justify-between px-5 border-b border-border-glow glass-panel shrink-0">
        <h2 className="text-base font-semibold text-text-primary truncate max-w-[70%]">
          {discussion.topic}
        </h2>
        <div className="flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${
            discussion.status === 'live' ? 'bg-status-green animate-pulse-glow' : 'bg-status-gray'
          }`} />
          <span className="text-xs text-text-dim">
            {discussion.status === 'live' ? '直播中' : discussion.status === 'ended' ? '已结束' : '待开始'}
          </span>
        </div>
      </header>

      {/* Transcript + 共识/分歧 */}
      <div className="flex-1 flex flex-col min-h-0">
        <TranscriptView />
        <ConsensusDivergencePanel />
      </div>
    </div>
  )
}
