import { useNavigate } from 'react-router-dom'
import { useAppStore } from '../../stores/appStore'
import { PulseDot } from '../common/PulseDot'

export function HomeDiscussionPreview() {
  const { discussions, loading } = useAppStore()
  const navigate = useNavigate()

  const previewItems = discussions.slice(0, 20)

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
      {/* 头部 */}
      <div className="px-6 py-7 border-b border-white/[0.05]">
        <div className="flex items-center justify-center gap-3">
          <span className="w-1 h-4 rounded-full bg-white/20" />
          <h2 className="text-2xl font-medium text-white/60 tracking-wide">
            最近讨论
          </h2>
        </div>
      </div>

      {/* 列表 */}
      <div className="max-h-[70vh] overflow-y-auto">
        {loading && discussions.length === 0 && (
          <div className="flex flex-col items-center gap-3 py-16">
            <div className="w-5 h-5 rounded-full border-2 border-white/10 border-t-white/30 animate-spin" />
            <p className="text-white/25 text-sm">加载中...</p>
          </div>
        )}

        {!loading && discussions.length === 0 && (
          <div className="flex flex-col items-center gap-3 py-16">
            <svg className="w-8 h-8 text-white/10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <p className="text-white/25 text-sm">暂无讨论，去创建一个吧</p>
          </div>
        )}

        {previewItems.map((d, i) => {
          const { dotStatus, label } = statusInfo(d.status)
          return (
            <button
              key={d.id}
              onClick={() => navigate(`/discussions/${d.id}`)}
              className="group relative w-full text-left px-6 py-4 border-b border-white/[0.04]
                         last:border-b-0 hover:bg-white/[0.03] transition-all duration-200 cursor-pointer"
            >
              {/* 左侧 hover 指示条 */}
              <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-0 bg-white/40
                               rounded-r-full transition-all duration-200 group-hover:h-8" />

              {/* 主体内容 */}
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-white/85 truncate leading-relaxed
                                group-hover:text-white/95 transition-colors duration-200">
                    {d.topic}
                  </p>
                  <div className="flex items-center gap-2.5 mt-2">
                    <PulseDot status={dotStatus} />
                    <span className="text-xs text-white/30">{label}</span>
                    <span className="text-white/10">·</span>
                    <span className="text-xs text-white/25">{d.panelist_count} 嘉宾</span>
                    <span className="text-white/10">·</span>
                    <span className="text-xs text-white/25">{d.message_count} 发言</span>
                  </div>
                </div>

                {/* 右侧序号 + 箭头 */}
                <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
                  <span className="text-xs text-white/10 font-mono tabular-nums
                                   group-hover:text-white/20 transition-colors duration-200">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <svg
                    className="w-3 h-3 text-white/10 group-hover:text-white/25 transition-all duration-200
                               -translate-x-1 opacity-0 group-hover:translate-x-0 group-hover:opacity-100"
                    fill="none" viewBox="0 0 24 24" stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default HomeDiscussionPreview
