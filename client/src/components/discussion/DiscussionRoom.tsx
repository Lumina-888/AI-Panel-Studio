import { useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useDiscussionStore } from '../../stores/discussionStore'
import { LoadingIndicator } from '../common/LoadingIndicator'
import { PulseDot } from '../common/PulseDot'
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
      <div className="flex-1 flex flex-col items-center justify-center gap-4">
        <LoadingIndicator visible />
        <p className="text-text-dim text-sm">加载讨论中...</p>
      </div>
    )
  }

  return (
    <div className="w-full flex flex-col h-full">
      {/* 顶栏 */}
      <header className="h-14 flex items-center pl-4 pr-5 border-b border-border-glow glass-panel shrink-0">
        <h2 className="text-lg font-semibold text-text-primary truncate max-w-[70%]">
          {discussion.topic}
        </h2>
        <PulseDot
          status={discussion.status === 'live' ? 'active' : discussion.status === 'pending' ? 'waiting' : 'ended'}
          className="ml-3"
        />
      </header>

      {/* Transcript + 共识/分歧 */}
      <div className="flex-1 flex flex-col min-h-0">
        <TranscriptView />
        <ConsensusDivergencePanel />
      </div>
    </div>
  )
}
