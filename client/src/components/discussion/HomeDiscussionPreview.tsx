// client/src/components/discussion/HomeDiscussionPreview.tsx
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '../../stores/appStore'
import { PulseDot } from '../common/PulseDot'

export function HomeDiscussionPreview() {
  const { discussions, loading } = useAppStore()
  const navigate = useNavigate()

  const previewItems = discussions.slice(0, 10)

  const statusInfo = (s: string) => {
    switch (s) {
      case 'live': return { dotStatus: 'active' as const, label: '运行中' }
      case 'pending': return { dotStatus: 'waiting' as const, label: '等待中' }
      case 'ended': return { dotStatus: 'ended' as const, label: '已结束' }
      default: return { dotStatus: 'ended' as const, label: s }
    }
  }

  return (
    <div className="home-panel rounded-2xl animate-breathe-glow overflow-hidden">
      {/* 顶部提示 */}
      <div className="px-5 py-4 border-b border-white/[0.04]">
        <p className="text-sm text-white/50">
          可以点击你感兴趣的话题直接进入哦
        </p>
      </div>

      {/* 列表 */}
      <div className="max-h-[70vh] overflow-y-auto">
        {loading && discussions.length === 0 && (
          <p className="text-white/30 text-sm text-center py-12">加载中...</p>
        )}
        {!loading && discussions.length === 0 && (
          <p className="text-white/30 text-sm text-center py-12">暂无讨论</p>
        )}

        {previewItems.map((d) => {
          const { dotStatus, label } = statusInfo(d.status)
          return (
            <button
              key={d.id}
              onClick={() => navigate(`/discussions/${d.id}`)}
              className="w-full text-left px-5 py-4 border-b border-white/[0.04] last:border-b-0
                         hover:bg-white/[0.02] transition-colors cursor-pointer"
            >
              <p className="text-sm font-medium text-white/90 truncate">{d.topic}</p>
              <div className="flex items-center gap-2 mt-1.5 text-xs text-white/35">
                <PulseDot status={dotStatus} />
                <span>{label}</span>
                <span>|</span>
                <span>{d.panelist_count} 位嘉宾</span>
                <span>|</span>
                <span>{d.message_count} 条发言</span>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
