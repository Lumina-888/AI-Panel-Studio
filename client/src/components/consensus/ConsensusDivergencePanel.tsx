import { useState, useRef } from 'react'
import { useDiscussionStore } from '../../stores/discussionStore'
import { GradientButton } from '../common/GradientButton'

type Tab = 'consensus' | 'divergence'

export function ConsensusDivergencePanel() {
  const { consensusPoints, divergencePoints } = useDiscussionStore()
  const [tab, setTab] = useState<Tab>('consensus')
  const [panelHeight, setPanelHeight] = useState(200)
  const startYRef = useRef(0)
  const startHRef = useRef(0)

  const onMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    startYRef.current = e.clientY
    startHRef.current = panelHeight
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
  }

  const onMouseMove = (e: MouseEvent) => {
    const delta = startYRef.current - e.clientY
    setPanelHeight(Math.max(200, Math.min(600, startHRef.current + delta)))
  }

  const onMouseUp = () => {
    document.removeEventListener('mousemove', onMouseMove)
    document.removeEventListener('mouseup', onMouseUp)
  }

  return (
    <div className="border-t border-border-glow glass-panel shrink-0 flex flex-col" style={{ height: panelHeight }}>
      {/* 拖拽调整高度 */}
      <div
        className="flex items-center justify-center h-5 cursor-ns-resize hover:bg-white/[0.03] border-t border-border-glow/20"
        onMouseDown={onMouseDown}
      >
        <div className="w-8 h-1 rounded-full bg-text-dim/30" />
      </div>

      {/* Tab 切换 */}
      <div className="flex border-b border-border-glow">
        <GradientButton
          onClick={() => setTab('consensus')}
          className={`gradient-button-ghost flex-1 rounded-none h-[20px] py-0.5 px-5 text-xs font-semibold border-b-2 bg-transparent
            ${tab === 'consensus'
              ? 'text-accent-cyan border-accent-cyan'
              : 'text-text-dim border-transparent hover:text-text-primary'
            }`}
        >
          ✓ 共识 ({consensusPoints.length})
        </GradientButton>
        <GradientButton
          onClick={() => setTab('divergence')}
          className={`gradient-button-ghost flex-1 rounded-none h-[20px] py-0.5 px-5 text-xs font-semibold border-b-2 bg-transparent
            ${tab === 'divergence'
              ? 'text-accent-magenta border-accent-magenta'
              : 'text-text-dim border-transparent hover:text-text-primary'
            }`}
        >
          ⚡ 分歧 ({divergencePoints.length})
        </GradientButton>
      </div>

      {/* 内容区 */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {tab === 'consensus' && consensusPoints.length === 0 && (
          <p className="text-xs text-text-dim text-center py-2">等待共识产生...</p>
        )}
        {tab === 'divergence' && divergencePoints.length === 0 && (
          <p className="text-xs text-text-dim text-center py-2">等待分歧浮现...</p>
        )}

        {tab === 'consensus' && consensusPoints.map((c) => (
          <div key={c.id} className="flex items-start gap-4 py-3 rounded-lg bg-accent-cyan/5
                                      border border-accent-cyan/15 animate-fade-in-up">
            <span className="text-accent-cyan text-xs mt-0.5">✓</span>
            <div className="min-w-0">
              <p className="text-base text-text-primary">{c.content}</p>
              <div className="flex items-center gap-2 mt-1">
                <div className="h-1 w-full rounded bg-white/10">
                  <div
                    className="h-1 rounded bg-accent-cyan transition-all"
                    style={{ width: `${(c.confidence * 100).toFixed(0)}%` }}
                  />
                </div>
                <span className="text-sm text-text-dim font-mono">
                  {(c.confidence * 100).toFixed(0)}%
                </span>
              </div>
            </div>
          </div>
        ))}

        {tab === 'divergence' && divergencePoints.map((d) => (
          <div key={d.id} className="py-3 rounded-lg bg-accent-magenta/5 border border-accent-magenta/15
                                    animate-fade-in-up">
            <p className="text-base text-text-primary mb-1.5">{d.content}</p>
            <div className="space-y-1">
              {d.perspectives.map((p, i) => (
                <div key={i} className="flex items-start gap-1.5">
                  <span className="text-accent-magenta text-xs mt-0.5 shrink-0">◆</span>
                  <span className="text-xs text-text-dim">{p}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
