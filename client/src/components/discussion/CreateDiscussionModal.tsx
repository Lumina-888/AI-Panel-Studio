import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '../../stores/appStore'
import { CloseIcon } from '../layout/Icons'
import { SlideButton } from '../common/SlideButton'
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
      navigate(`/discussion/${discussionId}`)
    } catch (e: any) {
      setError(e.message || '确认失败')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="glass-panel rounded-2xl w-[480px] max-w-[92vw] max-h-[85vh] overflow-y-auto
                      animate-fade-in-up shadow-[0_0_40px_rgba(0,229,255,0.1)]">
        {/* 顶栏 */}
        <div className="flex items-center justify-between p-5 border-b border-border-glow">
          <h3 className="text-lg font-semibold text-text-primary">
            {step === 'input' ? '发起新讨论' : '确认嘉宾阵容'}
          </h3>
          <button onClick={onClose} className="text-text-dim hover:text-text-primary transition-colors cursor-pointer">
            <CloseIcon />
          </button>
        </div>

        {step === 'input' && (
          <div className="p-5 space-y-5">
            <div>
              <label className="block text-sm text-text-dim mb-2">讨论话题</label>
              <textarea
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="输入你想要讨论的话题..."
                rows={3}
                className="w-full p-3 rounded-xl border border-border-glow bg-white/5 text-text-primary
                           placeholder:text-text-dim resize-none focus:outline-none focus:border-accent-cyan
                           transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm text-text-dim mb-2">
                专家人数：
                <span className="text-accent-cyan font-mono text-base">{expertCount}</span>
              </label>
              <input
                type="range"
                min={2}
                max={8}
                value={expertCount}
                onChange={(e) => setExpertCount(Number(e.target.value))}
                className="w-full accent-accent-cyan"
              />
              <div className="flex justify-between text-xs text-text-dim mt-1">
                <span>2 人</span>
                <span>8 人</span>
              </div>
            </div>

            {error && (
              <p className="text-accent-magenta text-sm bg-accent-magenta/5 rounded-lg p-2.5">{error}</p>
            )}

            <div className="flex gap-3 pt-2">
              <SlideButton
                onClick={handleGenerate}
                variant="primary"
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
              </SlideButton>
              <SlideButton onClick={onClose} variant="default">
                取消
              </SlideButton>
            </div>
          </div>
        )}

        {step === 'confirm' && (
          <div className="p-5 space-y-4">
            <p className="text-sm text-text-dim">
              以下是为 <span className="text-text-primary font-medium">{topic}</span> 生成的嘉宾阵容，确认后讨论即刻开始。
            </p>

            <div className="space-y-2">
              {panelists.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center gap-3 p-3 rounded-xl border border-white/5 bg-white/[0.02]"
                >
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold shrink-0"
                    style={{ backgroundColor: p.color + '22', color: p.color }}
                  >
                    {p.name[0]}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-text-primary">{p.name}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                        p.role === 'host'
                          ? 'bg-accent-cyan/20 text-accent-cyan'
                          : 'bg-white/10 text-text-dim'
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

            {error && (
              <p className="text-accent-magenta text-sm bg-accent-magenta/5 rounded-lg p-2.5">{error}</p>
            )}

            <div className="flex gap-3 pt-2">
              <SlideButton onClick={handleConfirm} variant="primary">
                确认，开始讨论
              </SlideButton>
              <SlideButton onClick={() => setStep('input')} variant="default">
                返回修改
              </SlideButton>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
