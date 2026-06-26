import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '../../stores/appStore'
import { CloseIcon } from '../layout/Icons'
import { GradientButton } from '../common/GradientButton'
import { OrbitLoader } from '../common/OrbitLoader'
import type { Panelist } from '../../types'

interface Props {
  onClose: () => void
}

type Step = 'input' | 'confirm'

export function CreateDiscussionModal({ onClose }: Props) {
  const { fetchDiscussions } = useAppStore()
  const navigate = useNavigate()

  const [step, setStep] = useState<Step>('input')
  const [topic, setTopic] = useState('')
  const [expertCount, setExpertCount] = useState(4)
  const [panelists, setPanelists] = useState<Panelist[]>([])
  const [discussionId, setDiscussionId] = useState('')
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState('')

  const handleGenerate = async () => {
    if (!topic.trim()) return
    setError('')
    setGenerating(true)
    try {
      const res = await fetch('/api/discussions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: topic.trim(), expert_count: expertCount }),
      })
      if (!res.ok) throw new Error('生成失败')
      const data = await res.json()
      setDiscussionId(data.id)
      setPanelists(data.panelists)
      setStep('confirm')
    } catch (e: any) {
      setError(e.message || '嘉宾生成失败，请重试')
    } finally {
      setGenerating(false)
    }
  }

  const handleConfirm = async () => {
    try {
      const res = await fetch(`/api/discussions/${discussionId}/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ panelists }),
      })
      if (!res.ok) throw new Error('确认失败')
      await fetchDiscussions()
      onClose()
      navigate(`/discussions/${discussionId}`)
    } catch (e: any) {
      setError(e.message || '确认失败')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="glass-panel rounded-2xl w-[520px] max-w-[92vw] max-h-[85vh] overflow-y-auto
                      animate-fade-in-up shadow-[0_0_40px_rgba(0,229,255,0.1)]">

        {/* 标题栏 */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4">
          <h3 className="text-lg font-semibold text-text-primary">
            {step === 'input' ? '发起新讨论' : '确认嘉宾阵容'}
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/10 text-text-dim hover:text-text-primary transition-colors cursor-pointer"
          >
            <CloseIcon />
          </button>
        </div>

        {/* ===== 步骤 1：输入 ===== */}
        {step === 'input' && (
          <>
            <div className="mx-6 mb-6 rounded-xl p-6 bg-white/[0.03] border border-white/[0.06] space-y-6">
              {/* 讨论话题 */}
              <div>
                <label className="block text-sm text-text-dim mb-3">讨论话题</label>
                <textarea
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="输入你想要讨论的话题..."
                  rows={4}
                  className="w-full p-3 rounded-xl border border-white/10 bg-white/5 text-text-primary text-base
                             placeholder:text-text-dim/60 resize-none focus:outline-none focus:border-accent-cyan
                             transition-colors"
                />
              </div>

              {/* 专家人数 */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm text-text-dim">专家人数</label>
                  <span className="font-mono text-xl text-accent-cyan tabular-nums">
                    {expertCount} 人
                  </span>
                </div>
                <input
                  type="range"
                  min={2}
                  max={8}
                  value={expertCount}
                  onChange={(e) => setExpertCount(Number(e.target.value))}
                  className="w-full accent-accent-cyan"
                />
                <div className="flex justify-between text-xs text-text-dim mt-1.5">
                  <span>2 人</span>
                  <span>8 人</span>
                </div>
              </div>

              {/* 错误提示 */}
              {error && (
                <p className="text-accent-magenta text-sm bg-accent-magenta/5 rounded-lg p-3">
                  ⚠ {error}
                </p>
              )}
            </div>

            {/* 按钮区 */}
            <div className="border-t border-white/[0.06] px-6 pb-6 pt-4 flex justify-evenly gap-4">
              <GradientButton onClick={onClose}>
                取消
              </GradientButton>
              <GradientButton
                onClick={handleGenerate}
                disabled={!topic.trim() || generating}
              >
                {generating ? (
                  <span className="flex items-center gap-2">
                    <OrbitLoader />
                    生成中...
                  </span>
                ) : (
                  '生成嘉宾阵容'
                )}
              </GradientButton>
            </div>
          </>
        )}

        {/* ===== 步骤 2：确认嘉宾 ===== */}
        {step === 'confirm' && (
          <>
            <div className="mx-6 mb-6 rounded-xl p-6 bg-white/[0.03] border border-white/[0.06] space-y-6">
              <p className="text-sm text-text-dim leading-relaxed">
                以下是为{' '}
                <span className="text-accent-cyan font-medium">{topic}</span>{' '}
                生成的嘉宾阵容，确认后讨论即刻开始。
              </p>

              {/* 嘉宾列表 */}
              <div className="space-y-3 max-h-[320px] overflow-y-auto">
                {panelists.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center gap-3 p-3 rounded-xl border border-white/[0.04] bg-white/[0.02]
                               hover:-translate-y-0.5 hover:bg-white/[0.04] transition-all duration-200"
                  >
                    {/* 左侧色条 */}
                    <div
                      className="w-[3px] self-stretch rounded-full shrink-0"
                      style={{ backgroundColor: p.color }}
                    />

                    {/* 头像 */}
                    <div
                      className="w-11 h-11 rounded-full flex items-center justify-center text-lg font-bold shrink-0"
                      style={{ backgroundColor: p.color + '22', color: p.color }}
                    >
                      {p.name[0]}
                    </div>

                    {/* 信息 */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-text-primary">{p.name}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                          p.role === 'host'
                            ? 'bg-accent-cyan/15 text-accent-cyan'
                            : 'bg-white/[0.06] text-text-dim'
                        }`}>
                          {p.role === 'host' ? '主持人' : '专家'}
                        </span>
                      </div>
                      <p className="text-xs text-text-dim mt-0.5">{p.title}</p>
                      <p className="text-xs text-text-dim mt-0.5">{p.stance}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* 错误提示 */}
              {error && (
                <p className="text-accent-magenta text-sm bg-accent-magenta/5 rounded-lg p-3">
                  ⚠ {error}
                </p>
              )}
            </div>

            {/* 按钮区 */}
            <div className="border-t border-white/[0.06] px-6 pb-6 pt-4 flex justify-evenly gap-4">
              <GradientButton onClick={() => setStep('input')}>
                返回修改
              </GradientButton>
              <GradientButton onClick={handleConfirm}>
                确认，开始讨论
              </GradientButton>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
