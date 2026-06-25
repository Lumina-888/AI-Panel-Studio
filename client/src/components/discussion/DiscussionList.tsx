import { useNavigate } from 'react-router-dom'
import { useAppStore } from '../../stores/appStore'
import { PlusIcon } from '../layout/Icons'
import type { DiscussionSummary } from '../../types'

interface Props {
  onNewDiscussion: () => void
}

export function DiscussionList({ onNewDiscussion }: Props) {
  const { discussions, loading, activeDiscussionId, setActiveDiscussion } = useAppStore()
  const navigate = useNavigate()

  const handleSelect = (d: DiscussionSummary) => {
    setActiveDiscussion(d.id)
    navigate(`/discussion/${d.id}`)
  }

  const statusLabel = (s: string) => {
    switch (s) {
      case 'live': return '● 进行中'
      case 'pending': return '○ 待开始'
      case 'ended': return '◎ 已结束'
    }
  }

  const statusClass = (s: string) => {
    switch (s) {
      case 'live': return 'text-status-green'
      case 'pending': return 'text-status-amber'
      case 'ended': return 'text-status-gray'
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* 头部 */}
      <div className="p-4 border-b border-border-glow flex items-center justify-between">
        <h2 className="text-lg font-semibold text-text-primary">讨论列表</h2>
        <button
          onClick={onNewDiscussion}
          className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-accent-cyan cursor-pointer"
          title="发起新讨论"
        >
          <PlusIcon />
        </button>
      </div>

      {/* 列表 */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {loading && discussions.length === 0 && (
          <p className="text-text-dim text-sm text-center py-8">加载中...</p>
        )}

        {!loading && discussions.length === 0 && (
          <p className="text-text-dim text-sm text-center py-8">
            暂无讨论，点击 + 发起
          </p>
        )}

        {discussions.map((d) => (
          <button
            key={d.id}
            onClick={() => handleSelect(d)}
            className={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer
              ${d.id === activeDiscussionId
                ? 'border-accent-cyan bg-accent-cyan/10 shadow-[0_0_12px_rgba(0,229,255,0.15)]'
                : 'border-white/5 hover:border-white/15 bg-white/[0.02]'
              }`}
          >
            <p className="text-sm font-medium text-text-primary truncate">{d.topic}</p>
            <div className="flex items-center gap-3 mt-1.5 text-xs text-text-dim">
              <span className={statusClass(d.status)}>{statusLabel(d.status)}</span>
              <span>{d.panelist_count} 位嘉宾</span>
              <span>{d.message_count} 条发言</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
