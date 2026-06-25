import { useDiscussionStore } from '../../stores/discussionStore'

interface Props {
  discussionId: string
}

export function PanelistSidebar(_props: Props) {
  const { panelists } = useDiscussionStore()

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-border-glow">
        <h2 className="text-lg font-semibold text-text-primary">专家状态</h2>
        <p className="text-xs text-text-dim mt-1">
          {panelists.length} 位嘉宾 · {panelists.filter((p) => p.role === 'expert').length} 位专家
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {panelists.map((p) => (
          <PanelistCard key={p.id} panelist={p} />
        ))}
      </div>
    </div>
  )
}

import type { Panelist } from '../../types'

function PanelistCard({ panelist: p }: { panelist: Panelist }) {
  const statusConfig = {
    speaking: { label: '发言中', ring: 'var(--color-status-green)', shadow: true },
    preparing: { label: '准备中', ring: 'var(--color-status-amber)', shadow: false },
    standby: { label: '待机', ring: 'var(--color-status-gray)', shadow: false },
  }

  const cfg = statusConfig[p.status]

  return (
    <div
      className={`p-3 rounded-xl border transition-all animate-fade-in-up
        ${p.status === 'speaking'
          ? 'border-accent-cyan/40 bg-accent-cyan/[0.06] shadow-[0_0_12px_rgba(0,229,255,0.08)]'
          : 'border-white/5 bg-white/[0.02]'
        }`}
    >
      {/* 头像 + 信息 */}
      <div className="flex items-center gap-3">
        <div className="relative shrink-0">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold"
            style={{ backgroundColor: p.color + '22', color: p.color }}
          >
            {p.name[0]}
          </div>
          {/* 状态灯 */}
          <div
            className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-bg-deep
              ${p.status === 'speaking' ? 'animate-pulse-glow' : ''}`}
            style={{
              backgroundColor: cfg.ring,
              ...(cfg.shadow ? { boxShadow: `0 0 8px ${cfg.ring}` } : {}),
            }}
          />
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-semibold text-text-primary">{p.name}</span>
            {p.role === 'host' && (
              <span className="text-xs px-1 py-0.5 rounded bg-accent-cyan/20 text-accent-cyan">主持</span>
            )}
          </div>
          <p className="text-xs text-text-dim">{p.title}</p>
        </div>

        <div className="ml-auto text-right shrink-0">
          <span
            className="text-xs font-mono"
            style={{ color: cfg.ring }}
          >
            {cfg.label}
          </span>
        </div>
      </div>

      {/* 当前关注点 */}
      {p.focus && (
        <div className="mt-2 pt-2 border-t border-white/5">
          <p className="text-xs text-text-dim leading-relaxed">
            <span className="text-text-dim/60">关注: </span>
            {p.focus}
          </p>
        </div>
      )}
    </div>
  )
}
