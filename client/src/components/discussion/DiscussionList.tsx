import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '../../stores/appStore'
import { PinIcon, DeleteIcon, CloseIcon } from '../layout/Icons'
import { PulseDot } from '../common/PulseDot'
import { StarButton } from '../common/StarButton'
import type { DiscussionSummary } from '../../types'
import { GradientButton } from '../common/GradientButton'


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
    navigate(`/discussions/${d.id}`)
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    const wasActive = deleteTarget.id === activeDiscussionId
    await deleteDiscussion(deleteTarget.id)
    setDeleteTarget(null)
    if (wasActive) navigate('/discussions')
  }

  const statusInfo = (s: string) => {
    switch (s) {
      case 'live': return { dotStatus: 'active' as const, label: '运行中' }
      case 'pending': return { dotStatus: 'waiting' as const, label: '等待中' }
      case 'ended': return { dotStatus: 'ended' as const, label: '已结束' }
      default: return { dotStatus: 'ended' as const, label: s }
    }
  }

  return (
    <div className="flex flex-col h-full max-w-[410px]">
      {/* 头部 */}
      <div className="p-4 border-b border-border-glow flex items-center justify-between">
        <h2 className="text-lg font-semibold text-text-primary">讨论列表</h2>
        <StarButton onClick={onNewDiscussion}>
          新讨论
        </StarButton>
      </div>

      {/* 列表 */}
      <div className="flex-1 overflow-y-auto">
        {loading && discussions.length === 0 && (
          <p className="text-text-dim text-sm text-center py-12">加载中...</p>
        )}

        {!loading && discussions.length === 0 && (
          <p className="text-text-dim text-sm text-center py-12">
            暂无讨论，点击上方按钮发起
          </p>
        )}

        {discussions.map((d) => {
          const { dotStatus, label } = statusInfo(d.status)
          return (
            <div
              key={d.id}
              className={`relative group w-full text-left px-4 py-5 border-b border-border-glow/15 transition-colors
                ${d.id === activeDiscussionId
                  ? 'bg-accent-cyan/[0.06]'
                  : 'hover:bg-white/[0.02]'
                }`}
            >
              <button
                onClick={() => handleSelect(d)}
                className="w-full text-left pr-20 cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  {d.pinned_at && (
                    <span className="text-accent-cyan shrink-0">
                      <PinIcon filled />
                    </span>
                  )}
                  <p className="text-sm font-medium text-text-primary truncate">{d.topic}</p>
                </div>
                <div className="flex items-center gap-2 mt-2 text-xs text-text-dim">
                  <PulseDot status={dotStatus} />
                  <span>{label}</span>
                  <span className="text-text-dim/40">|</span>
                  <span>{d.panelist_count} 位嘉宾</span>
                  <span className="text-text-dim/40">|</span>
                  <span>{d.message_count} 条发言</span>
                </div>
              </button>

              {/* 右下操作按钮 */}
              <div className="absolute bottom-3 right-3 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={(e) => { e.stopPropagation(); togglePin(d.id, !d.pinned_at) }}
                  className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                    d.pinned_at
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
          )
        })}
      </div>

      {/* 删除确认弹窗 — 统一框架 */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="glass-panel rounded-2xl w-[480px] max-w-[92vw] animate-fade-in-up">

            {/* 标题栏 */}
            <div className="flex items-center justify-between px-6 pt-6 pb-4">
              <h3 className="text-lg font-semibold text-text-primary">确认删除</h3>
              <button
                onClick={() => setDeleteTarget(null)}
                className="p-1.5 rounded-lg hover:bg-white/10 text-text-dim hover:text-text-primary transition-colors cursor-pointer"
              >
                <CloseIcon />
              </button>
            </div>

            {/* 内容卡片 */}
            <div className="mx-6 mb-6 rounded-xl p-6 bg-white/[0.03] border border-white/[0.06] space-y-4">
              <p className="text-sm text-text-dim">
                ⚠ 确定要删除以下讨论吗？此操作不可撤销。
              </p>
              <p className="text-sm font-medium text-text-primary truncate bg-white/[0.04] rounded-lg p-3">
                {deleteTarget.topic}
              </p>
            </div>

            {/* 按钮区 */}
            <div className="border-t border-white/[0.06] px-6 pb-6 pt-4 flex justify-evenly gap-4">
              <GradientButton onClick={() => setDeleteTarget(null)}>
                取消
              </GradientButton>
              <GradientButton onClick={handleDelete}>
                确认删除
              </GradientButton>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
