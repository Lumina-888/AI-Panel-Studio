import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '../../stores/appStore'
import { PlusIcon, PinIcon, DeleteIcon, CloseIcon } from '../layout/Icons'
import type { DiscussionSummary } from '../../types'

interface Props {
  onNewDiscussion: () => void
}

export function DiscussionList({ onNewDiscussion }: Props) {
  const {
    discussions, loading, activeDiscussionId,
    setActiveDiscussion, deleteDiscussion, togglePin,
  } = useAppStore()
  const navigate = useNavigate()
  const [deleteTarget, setDeleteTarget] = useState<DiscussionSummary | null>(null)

  const handleSelect = (d: DiscussionSummary) => {
    setActiveDiscussion(d.id)
    navigate(`/discussion/${d.id}`)
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    const wasActive = deleteTarget.id === activeDiscussionId
    await deleteDiscussion(deleteTarget.id)
    setDeleteTarget(null)
    if (wasActive) navigate('/')
  }

  const statusLabel = (s: string) => {
    switch (s) {
      case 'live': return '● 直播中'
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
          <div
            key={d.id}
            className={`relative group w-full text-left p-3 rounded-xl border transition-all
              ${d.id === activeDiscussionId
                ? 'border-accent-cyan bg-accent-cyan/10 shadow-[0_0_12px_rgba(0,229,255,0.15)]'
                : 'border-white/5 hover:border-white/15 bg-white/[0.02]'
              }`}
          >
            {/* 主点击区域 */}
            <button
              onClick={() => handleSelect(d)}
              className="w-full text-left pr-16 cursor-pointer"
            >
              <div className="flex items-center gap-1.5">
                {d.pinned_at && (
                  <span className="text-accent-cyan shrink-0">
                    <PinIcon filled />
                  </span>
                )}
                <p className="text-sm font-medium text-text-primary truncate">{d.topic}</p>
              </div>
              <div className="flex items-center gap-3 mt-1.5 text-xs text-text-dim">
                <span className={statusClass(d.status)}>{statusLabel(d.status)}</span>
                <span>{d.panelist_count} 位嘉宾</span>
                <span>{d.message_count} 条发言</span>
              </div>
            </button>

            {/* 右下角操作按钮 */}
            <div className="absolute bottom-2 right-2 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={(e) => { e.stopPropagation(); togglePin(d.id, !d.pinned_at) }}
                className={`p-1.5 rounded-md transition-colors cursor-pointer
                  ${d.pinned_at
                    ? 'text-accent-cyan bg-accent-cyan/10'
                    : 'text-text-dim hover:text-text-primary hover:bg-white/10'
                  }`}
                title={d.pinned_at ? '取消置顶' : '置顶'}
              >
                <PinIcon filled={!!d.pinned_at} />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setDeleteTarget(d) }}
                className="p-1.5 rounded-md text-text-dim hover:text-red-400 hover:bg-red-400/10 transition-colors cursor-pointer"
                title="删除讨论"
              >
                <DeleteIcon />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* 删除确认弹窗 */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-surface-dark border border-border-glow rounded-2xl p-6 w-80 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-text-primary">确认删除</h3>
              <button
                onClick={() => setDeleteTarget(null)}
                className="p-1 rounded-md hover:bg-white/10 text-text-dim hover:text-text-primary transition-colors cursor-pointer"
              >
                <CloseIcon />
              </button>
            </div>
            <p className="text-sm text-text-dim mb-2">
              确定要删除以下讨论吗？此操作不可撤销。
            </p>
            <p className="text-sm font-medium text-text-primary mb-6 truncate">
              "{deleteTarget.topic}"
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 py-2 px-4 rounded-xl border border-white/10 text-text-dim hover:text-text-primary hover:bg-white/5 transition-colors cursor-pointer text-sm"
              >
                取消
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 py-2 px-4 rounded-xl bg-red-500/20 border border-red-500/30 text-red-400 hover:bg-red-500/30 transition-colors cursor-pointer text-sm font-medium"
              >
                确认删除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
