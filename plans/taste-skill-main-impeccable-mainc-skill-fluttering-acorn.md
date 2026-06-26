# AI Panel Studio 全站视觉重设计 — 实施计划

> **For agentic workers:** 使用 `superpowers:subagent-driven-development` 按任务逐个实施。每步使用 checkbox (`- [ ]`) 追踪。

**Goal:** 将 AI Panel Studio 三个层级的所有页面按新设计规范重做 UI，不改任何功能逻辑。

**Architecture:** 三条独立路由（`/` 主页、`/discussions` 演播厅、`/discussion/:id` 讨论室），复用现有手写组件体系，新建 PulseDot/HomeDiscussionPreview 等组件，原地重新设计 DiscussionList/TranscriptView 等核心组件。

**Tech Stack:** React 19 + TypeScript + Tailwind v4 + Zustand + react-router-dom v7

## 设计质量控制 (taste-skill + impeccable 约束)

实施全程遵守以下硬性规则：

| 约束 | 来源 | 规则 |
|------|------|------|
| 色彩一致性 | taste §4.2 | 一个强调色贯穿全页，主页白/演播厅青 |
| 圆角一致性 | taste §4.4 | 统一使用 `rounded-xl`/`rounded-2xl`，不混用 |
| 无 AI 紫 | taste §4.2 LILA RULE | 禁用紫/蓝紫渐变，用青 `#00e5ff` 替代 |
| 无侧边条纹 | impeccable | `border-l`/`border-r` > 1px 禁止 |
| 无渐变文字 | impeccable | 禁止 `background-clip: text` |
| 动效动机 | taste §5.D | 每个动画需有一句话理由，无理由则去除 |
| reduced-motion | taste §6.B | 所有动画包裹 `prefers-reduced-motion` |
| 暗色模式 | taste §8 | 全程暗色，`bg-zinc-950`/`#08081a` off-black |
| 对比度 | impeccable | body text ≥ 4.5:1, large text ≥ 3:1 |
| 无 em-dash | taste §9.G | 零 `—` / `–` 字符 |
| z-index 语义 | impeccable | 不随意 `z-50`/`z-999`，用层级体系 |
| 响应式 | taste §4.7 | 桌面/平板/手机三档明确 fallback |

## 全局约束

- 所有功能、API、Zustand store 逻辑**不改动**
- TypeScript 类型定义不改
- 服务端代码零变动
- 中文 UI
- 组件基于 `client/src/components/` 现有体系

---

## Phase 1: Foundation — 主题变量 + PulseDot + 背景组件扩展

### Task 1: style.css — 新增主页主题变量 + 呼吸辉光动画

**Files:**
- Modify: `client/src/style.css`

**Interfaces:**
- Produces: CSS 变量 `--color-home-*`、动画 `@keyframes breatheGlow`、工具类 `.animate-breathe-glow`、`.home-panel`

- [ ] **Step 1: 在 `@theme` 块和动画区之间插入主页色板和呼吸辉光动画**

在 `client/src/style.css` 的 `}` (closing `@theme` brace) 之后，`/* ===== 全局基础 ===== */` 之前，插入：

```css
/* ===== 主页（黑白调）主题变量 ===== */

:root {
  --color-home-bg: #0a0a0a;
  --color-home-text: #f5f5f5;
  --color-home-dim: rgba(255, 255, 255, 0.45);
  --color-home-panel: rgba(255, 255, 255, 0.03);
  --color-home-border: rgba(255, 255, 255, 0.06);
}

/* ===== 呼吸辉光动画（主页预览面板） ===== */

@keyframes breatheGlow {
  0%, 100% { box-shadow: 0 0 12px rgba(255, 255, 255, 0.03), 0 0 24px rgba(255, 255, 255, 0.015); }
  50%      { box-shadow: 0 0 18px rgba(255, 255, 255, 0.06), 0 0 36px rgba(255, 255, 255, 0.03); }
}

.animate-breathe-glow {
  animation: breatheGlow 3s ease-in-out infinite;
}

@media (prefers-reduced-motion: reduce) {
  .animate-breathe-glow {
    animation: none;
  }
}

.home-panel {
  background: var(--color-home-panel);
  backdrop-filter: blur(8px);
  border: 1px solid var(--color-home-border);
}
```

- [ ] **Step 2: 在 `@theme` 块内追加主页颜色 token**

在 `--color-status-gray: #555555;` 之后添加：

```css
  --color-home-bg: #0a0a0a;
  --color-home-text: #f5f5f5;
  --color-home-dim: rgba(255, 255, 255, 0.45);
  --color-home-panel: rgba(255, 255, 255, 0.03);
  --color-home-border: rgba(255, 255, 255, 0.06);
```

- [ ] **Step 3: 确认文件语法正确**

Run: `cd client && npx tailwindcss --help` (验证 Tailwind CLI 可用)

---

### Task 2: PulseDot 组件 — 三态脉冲圆点

**Files:**
- Create: `client/src/components/common/PulseDot.tsx`

**Interfaces:**
- Produces: `PulseDot` 组件，props: `status: 'active' | 'waiting' | 'ended'`, `className?: string`
- 渲染 `span` 元素，内联 style 控制颜色和动画

- [ ] **Step 1: 创建 PulseDot 组件**

```tsx
// client/src/components/common/PulseDot.tsx
interface PulseDotProps {
  status: 'active' | 'waiting' | 'ended'
  className?: string
}

/**
 * 三态脉冲圆点指示器
 * - active:  绿色 #00e676，脉冲呼吸动效
 * - waiting: 白色 #ffffff，脉冲呼吸动效
 * - ended:   灰色 #555555，静止
 */
export function PulseDot({ status, className = '' }: PulseDotProps) {
  const colorMap = {
    active: '#00e676',
    waiting: '#ffffff',
    ended: '#555555',
  }

  const color = colorMap[status]
  const shouldAnimate = status !== 'ended'

  return (
    <span
      className={`inline-block rounded-full ${className}`}
      style={{
        width: 8,
        height: 8,
        backgroundColor: color,
        boxShadow: shouldAnimate ? `0 0 6px ${color}` : 'none',
        animation: shouldAnimate ? 'pulseGlow 2s ease-in-out infinite' : 'none',
        flexShrink: 0,
      }}
      role="status"
      aria-label={status === 'active' ? '运行中' : status === 'waiting' ? '等待中' : '已结束'}
    />
  )
}
```

- [ ] **Step 2: 追加 reduced-motion 规则到 style.css**

在 `style.css` 末尾追加：

```css
@media (prefers-reduced-motion: reduce) {
  .animate-pulse-glow,
  .animate-circle-pulse,
  .animate-dot-pulse,
  .animate-outline-ripple,
  .animate-shimmer,
  .animate-breathe-glow {
    animation: none !important;
  }
}
```

- [ ] **Step 3: 验证编译**

Run: `cd client && npx tsc --noEmit --pretty`

---

### Task 3: StarfieldBackground — theme prop 支持主页黑白渐变

**Files:**
- Modify: `client/src/components/background/main.tsx`
- Modify: `client/src/components/background/main.css`

- [ ] **Step 1: 在 main.tsx 添加 theme prop**

将现有 `StarfieldBackground` 改为：

```tsx
import React from 'react'
import './main.css'

interface StarfieldBackgroundProps {
  theme?: 'mono' | 'blue'
}

const StarfieldBackground: React.FC<StarfieldBackgroundProps> = ({ theme = 'blue' }) => {
  return (
    <div className={`starfield-container ${theme === 'mono' ? 'sf-mono' : 'sf-blue'}`}>
      <div id="stars" />
      <div id="stars2" />
      <div id="stars3" />
    </div>
  )
}

export default StarfieldBackground
```

- [ ] **Step 2: 在 main.css 追加 mono 主题样式**

在 `main.css` 末尾追加：

```css
.sf-blue {
  background: radial-gradient(ellipse at bottom, #1b2735 0%, #090a0f 100%);
}

.sf-mono {
  background: radial-gradient(ellipse at bottom, #1a1a1a 0%, #050505 100%);
}

.sf-mono #stars,
.sf-mono #stars2,
.sf-mono #stars3 {
  /* 白色星星在黑白主题下保持不变 */
}
```

同时将原 `.starfield-container` 的 `background` 属性移除（改为由 `.sf-blue`/`.sf-mono` 类控制）：

```css
.starfield-container {
  height: 100%;
  width: 100%;
  overflow: hidden;
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 0;
}
```

---

## Phase 2: Level 3 — 弹窗统一重构

### Task 4: SlideButton 增强 — 滑动渐变效果

**Files:**
- Modify: `client/src/components/common/SlideButton.tsx`
- Modify: `client/src/style.css` (追加 .sd-* 样式)

- [ ] **Step 1: 替换 SlideButton.tsx**

```tsx
// client/src/components/common/SlideButton.tsx
interface SlideButtonProps {
  children: React.ReactNode
  onClick?: () => void
  variant?: 'primary' | 'danger' | 'default'
  disabled?: boolean
  className?: string
}

/**
 * 滑动渐变按钮
 * variant: primary (青蓝渐变) | danger (红色渐变) | default (灰色)
 */
export function SlideButton({
  children,
  onClick,
  variant = 'primary',
  disabled = false,
  className = '',
}: SlideButtonProps) {
  const base =
    'relative inline-flex items-center justify-center px-6 py-2.5 rounded-xl font-semibold text-sm overflow-hidden transition-all duration-300 cursor-pointer select-none'

  const variantClass = {
    primary:
      'bg-gradient-to-r from-cyan-600 to-blue-600 text-white hover:from-cyan-500 hover:to-blue-500 hover:shadow-[0_0_20px_rgba(0,229,255,0.3)]',
    danger:
      'bg-gradient-to-r from-red-600 to-rose-600 text-white hover:from-red-500 hover:to-rose-500 hover:shadow-[0_0_20px_rgba(255,64,129,0.3)]',
    default:
      'bg-white/5 text-text-primary border border-white/10 hover:bg-white/10',
  }

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${variantClass[variant]} ${disabled ? 'opacity-40 cursor-not-allowed' : ''} ${className}`}
      type="button"
    >
      {/* 滑动光泽层 */}
      <span
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full hover:translate-x-full transition-transform duration-500 ease-out"
        aria-hidden="true"
      />
      <span className="relative z-10">{children}</span>
    </button>
  )
}

export default SlideButton
```

- [ ] **Step 2: 验证编译**

Run: `cd client && npx tsc --noEmit --pretty`

---

### Task 5: CreateDiscussionModal 重新设计

**Files:**
- Modify: `client/src/components/discussion/CreateDiscussionModal.tsx`

**Interfaces:**
- Consumes: `SlideButton` (from Task 4), `OrbitLoader` (existing)
- Props 不变: `{ onClose: () => void }`

- [ ] **Step 1: 重写 CreateDiscussionModal 的 UI 层**

完整替换 `CreateDiscussionModal.tsx`——保持所有 state 逻辑和 API 调用不变，仅替换 JSX 样式部分。关键变更：

1. 外层遮罩使用 `fixed inset-0 z-50 bg-black/70 backdrop-blur-sm`
2. 面板使用 `glass-panel rounded-2xl w-[480px] max-w-[92vw] animate-fade-in-up`
3. 步骤按钮全部替换为 SlideButton（variant="primary" / variant="default"）
4. 加载状态嵌入 OrbitLoader
5. 每步保持原有 state 逻辑（topic, expertCount, panelists, generating, handleGenerate, handleConfirm）
6. 两个步骤的 JSX 部分替换为下面附上的代码

**完整 CreateDiscussionModal.tsx 代码：**

```tsx
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
```

- [ ] **Step 2: 验证 TypeScript 编译**

Run: `cd client && npx tsc --noEmit --pretty`

---

### Task 6: DiscussionList — 删除确认弹窗统一 + PulseDot + StarButton

**Files:**
- Modify: `client/src/components/discussion/DiscussionList.tsx`

**Interfaces:**
- Consumes: `PulseDot` (Task 2), `StarButton` (existing), `SlideButton` (Task 4)
- Props 不变: `{ onNewDiscussion: () => void }`

- [ ] **Step 1: 重写 DiscussionList 头部和列表项 UI**

关键变更：
1. 头部 `+` 按钮换为 `StarButton`
2. 列表项状态文字换为 `PulseDot` + 文字标签
3. 删除确认弹窗改为统一框架（glass-panel + SlideButton）
4. 列表间距加大到 `py-5`，分隔用 `border-b border-border-glow/15`

完整替换 `DiscussionList.tsx`：

```tsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '../../stores/appStore'
import { PinIcon, DeleteIcon, CloseIcon } from '../layout/Icons'
import { PulseDot } from '../common/PulseDot'
import { StarButton } from '../common/StarButton'
import { SlideButton } from '../common/SlideButton'
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
    <div className="flex flex-col h-full">
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
          <div className="glass-panel rounded-2xl w-[420px] max-w-[92vw] p-6 animate-fade-in-up">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-text-primary">确认删除</h3>
              <button
                onClick={() => setDeleteTarget(null)}
                className="p-1 rounded-md hover:bg-white/10 text-text-dim hover:text-text-primary transition-colors cursor-pointer"
              >
                <CloseIcon />
              </button>
            </div>
            <p className="text-sm text-text-dim mb-2">确定要删除以下讨论吗？此操作不可撤销。</p>
            <p className="text-sm font-medium text-text-primary mb-6 truncate bg-white/[0.03] rounded-lg p-2.5">
              {deleteTarget.topic}
            </p>
            <div className="flex gap-3">
              <SlideButton onClick={handleDelete} variant="danger">
                确认删除
              </SlideButton>
              <SlideButton onClick={() => setDeleteTarget(null)} variant="default">
                取消
              </SlideButton>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: 验证编译**

Run: `cd client && npx tsc --noEmit --pretty`

---

## Phase 3: Level 1 — 主页 (`/`)

### Task 7: HomeDiscussionPreview 组件

**Files:**
- Create: `client/src/components/discussion/HomeDiscussionPreview.tsx`

**Interfaces:**
- Consumes: `PulseDot` (Task 2), `useAppStore`
- Produces: `HomeDiscussionPreview` 组件，无 props（从 store 读数据）
- 点击 item → `navigate(/discussion/:id)`

- [ ] **Step 1: 创建 HomeDiscussionPreview**

```tsx
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
              onClick={() => navigate(`/discussion/${d.id}`)}
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
```

---

### Task 8: HomePage 页面

**Files:**
- Create: `client/src/pages/HomePage.tsx`

**Interfaces:**
- Consumes: `StarfieldBackground` (Task 3), `HamsterLoader`, `CyberCard`, `ExpandCard`, `HomeDiscussionPreview` (Task 7)
- Produces: `HomePage` 页面组件

- [ ] **Step 1: 创建 pages 目录**

```bash
mkdir -p client/src/pages
```

- [ ] **Step 2: 创建 HomePage.tsx**

```tsx
// client/src/pages/HomePage.tsx
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '../stores/appStore'
import StarfieldBackground from '../components/background/main'
import { HamsterLoader } from '../components/common/HamsterLoader'
import { CyberCard } from '../components/common/CyberCard'
import { ExpandCard } from '../components/common/ExpandCard'
import { HomeDiscussionPreview } from '../components/discussion/HomeDiscussionPreview'

export function HomePage() {
  const { fetchDiscussions } = useAppStore()
  const navigate = useNavigate()

  useEffect(() => {
    fetchDiscussions()
  }, [fetchDiscussions])

  return (
    <div className="relative min-h-[100dvh] w-full bg-[#0a0a0a] text-white overflow-hidden">
      {/* 星空背景 */}
      <StarfieldBackground theme="mono" />

      {/* 内容层 */}
      <div className="relative z-10 max-w-[1400px] mx-auto px-6 md:px-12 lg:px-16 py-12 min-h-[100dvh] flex flex-col justify-center">
        {/* 右上角仓鼠 */}
        <div className="absolute top-6 right-6 md:top-10 md:right-12 z-20 opacity-70 hover:opacity-100 transition-opacity">
          <HamsterLoader />
        </div>

        {/* 两栏布局 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-start">
          {/* 左栏：讨论预览 */}
          <div>
            <HomeDiscussionPreview />
          </div>

          {/* 右栏：项目介绍 + 发起新讨论 */}
          <div className="flex flex-col gap-8">
            <ExpandCard
              title="AI Panel Studio"
              description="AI 驱动的圆桌讨论平台。输入话题，动态生成主持人加专家阵群，实时多视角辩论，共识与分歧可视化追踪。深色演播厅主题，科技感十足。"
            />

            <div className="flex justify-center lg:justify-start">
              <CyberCard
                title="发起新讨论"
                prompt="开始"
                onClick={() => navigate('/discussions')}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: 检查 ExpandCard 和 CyberCard 组件的 props 接口**

需要确认这两个组件是否接受 `title`/`description`/`prompt`/`onClick` props。如不匹配则按实际接口调整。先读取它们确认：

Run explore: Read `client/src/components/common/ExpandCard.tsx` and `client/src/components/common/CyberCard.tsx`

- [ ] **Step 4: 根据实际接口调整 HomePage 中的 props 调用**

（此步在 Step 3 确认后执行）

---

## Phase 4: Level 2 — 演播厅 (`/discussions`, `/discussion/:id`)

### Task 9: StudioLayout 三栏演播厅布局页面

**Files:**
- Create: `client/src/pages/StudioLayout.tsx`

**Interfaces:**
- Consumes: `DiscussionList` (Task 6), `CreateDiscussionModal` (Task 5), `Outlet`
- Produces: `StudioLayout` 页面组件

- [ ] **Step 1: 创建 StudioLayout.tsx**

```tsx
// client/src/pages/StudioLayout.tsx
import { useEffect, useState } from 'react'
import { Outlet, useParams } from 'react-router-dom'
import { useAppStore } from '../stores/appStore'
import { DiscussionList } from '../components/discussion/DiscussionList'
import { CreateDiscussionModal } from '../components/discussion/CreateDiscussionModal'
import { Drawer } from '../components/layout/Drawer'
import { MenuIcon, UsersIcon } from '../components/layout/Icons'
import { PanelistSidebar } from '../components/panelist/PanelistSidebar'

export function StudioLayout() {
  const { id } = useParams<{ id?: string }>()
  const { fetchDiscussions, createModalOpen, openCreateModal, closeCreateModal } = useAppStore()
  const [leftOpen, setLeftOpen] = useState(false)
  const [rightOpen, setRightOpen] = useState(false)
  const isRoom = !!id

  useEffect(() => {
    fetchDiscussions()
  }, [fetchDiscussions])

  return (
    <div className="h-full w-full flex bg-bg-deep dot-grid">
      {/* 左侧讨论列表 — 无极宽度: min 280, max 340 */}
      <aside className="hidden md:flex flex-col border-r border-border-glow glass-panel shrink-0"
             style={{ minWidth: 280, maxWidth: 340, width: '20vw' }}>
        <DiscussionList onNewDiscussion={openCreateModal} />
      </aside>

      {/* 主舞台 — flex-1 占满, max 1300px */}
      <main className="flex-1 flex flex-col min-w-0">
        <div className="flex-1 max-w-[1300px] mx-auto w-full">
          <Outlet />
        </div>
        {!isRoom && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center animate-fade-in-up">
              <div className="text-5xl mb-5">🎙️</div>
              <h1 className="text-xl font-bold text-text-primary mb-2">AI Panel Studio</h1>
              <p className="text-text-dim">从左侧选择讨论，或发起新的圆桌会议</p>
            </div>
          </div>
        )}
      </main>

      {/* 右侧专家面板 — 仅在有讨论时显示, 无极宽度 */}
      {isRoom && (
        <aside className="hidden md:flex flex-col border-l border-border-glow glass-panel shrink-0"
               style={{ minWidth: 280, maxWidth: 380, width: '22vw' }}>
          <PanelistSidebar discussionId={id!} />
        </aside>
      )}

      {/* 窄屏底部栏 */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 h-12 flex items-center justify-between
                      bg-bg-panel backdrop-blur border-t border-border-glow px-4 z-40">
        <button onClick={() => setLeftOpen(true)} className="flex items-center gap-2 text-text-primary cursor-pointer">
          <MenuIcon /> 讨论
        </button>
        {isRoom && (
          <button onClick={() => setRightOpen(true)} className="flex items-center gap-2 text-text-primary cursor-pointer">
            专家 <UsersIcon />
          </button>
        )}
      </div>

      {/* Drawer 侧滑 */}
      <Drawer side="left" open={leftOpen} onClose={() => setLeftOpen(false)}>
        <DiscussionList onNewDiscussion={openCreateModal} />
      </Drawer>
      <Drawer side="right" open={rightOpen} onClose={() => setRightOpen(false)}>
        {isRoom && <PanelistSidebar discussionId={id!} />}
      </Drawer>

      {/* 创建讨论弹窗 */}
      {createModalOpen && <CreateDiscussionModal onClose={closeCreateModal} />}
    </div>
  )
}
```

---

### Task 10: TranscriptView — 消息横线分隔，去圆角卡片

**Files:**
- Modify: `client/src/components/transcript/TranscriptView.tsx`

**需要先读取当前文件确认完整逻辑，再做精准修改。** 关键变更：
1. 消息容器去 `rounded-xl` 卡片样式
2. 消息间 `border-t border-accent-cyan/10` 分隔
3. 消息内部 `px-6 py-5` 留白
4. 保留所有原有逻辑（auto-scroll, SSE 消息追加等）

- [ ] **Step 1: 读取当前 TranscriptView.tsx**
- [ ] **Step 2: 修改消息渲染部分的 Tailwind 类名**
- [ ] **Step 3: 编译验证**

---

### Task 11: DiscussionRoom — 主舞台标题左对齐 + 顶部 PulseDot

**Files:**
- Modify: `client/src/components/discussion/DiscussionRoom.tsx`

**先读取，再修改。** 关键变更：
1. 标题行标题左对齐 `pl-4`
2. 添加 PulseDot 状态指示器在标题旁边
3. `max-w-[1300px] mx-auto` 容器

- [ ] **Step 1: 读取当前 DiscussionRoom.tsx**
- [ ] **Step 2: 修改标题行和容器样式**
- [ ] **Step 3: 编译验证**

---

### Task 12: ConsensusDivergencePanel — 拖拽调整高度 + 字号统一

**Files:**
- Modify: `client/src/components/consensus/ConsensusDivergencePanel.tsx`

**先读取，再修改。** 关键变更：
1. 共识标题 `text-base`，内容 `text-sm`
2. 分歧标题 `text-base`（与共识相同），内容 `text-xs`
3. 进度条统一 `w-full`
4. 间距 `py-3 gap-4`
5. **拖拽手柄**：在面板顶部添加一个 `cursor-ns-resize` 手柄，用 `onMouseDown` + `onMouseMove` 调整面板高度

- [ ] **Step 1: 读取当前文件**
- [ ] **Step 2: 实现拖拽调整高度的逻辑**

```tsx
// 在组件内部添加
const [panelHeight, setPanelHeight] = useState(320) // 默认高度 px
const dragRef = useRef<HTMLDivElement>(null)
const startYRef = useRef(0)
const startHRef = useRef(0)

const onMouseDown = (e: React.MouseEvent) => {
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
```

- [ ] **Step 3: 修改字号和间距**
- [ ] **Step 4: 编译验证**

---

### Task 13: PanelistSidebar — BarLoader 音波条 + 布局调整

**Files:**
- Modify: `client/src/components/panelist/PanelistSidebar.tsx`

**先读取，再修改。** 关键变更：
1. 头像左侧添加 BarLoader，speaking 时运行动效，否则静止
2. 待机/发言中状态文字右对齐
3. 卡片间距 `gap-5`，每项 `py-3`
4. 保留状态指示灯

- [ ] **Step 1: 读取当前 PanelistSidebar.tsx**
- [ ] **Step 2: 修改专家卡片渲染逻辑，嵌入 BarLoader**
- [ ] **Step 3: 编译验证**

---

## Phase 5: Route Integration — 路由连接 + AppLayout 精简

### Task 14: App.tsx — 新的三路由结构

**Files:**
- Modify: `client/src/App.tsx`

- [ ] **Step 1: 替换 App.tsx**

```tsx
// client/src/App.tsx
import { Routes, Route } from 'react-router-dom'
import { HomePage } from './pages/HomePage'
import { StudioLayout } from './pages/StudioLayout'
import { DiscussionRoom } from './components/discussion/DiscussionRoom'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/discussions" element={<StudioLayout />}>
        <Route path="discussion/:id" element={<DiscussionRoom />} />
      </Route>
    </Routes>
  )
}
```

- [ ] **Step 2: 验证编译**

Run: `cd client && npx tsc --noEmit --pretty`

---

### Task 15: AppLayout.tsx — 保留为降级方案或移除

**Files:**
- Modify: `client/src/components/layout/AppLayout.tsx`

AppLayout 不再被路由直接引用（路由已改为 HomePage + StudioLayout）。保留文件作为参考，或添加废弃注释。

- [ ] **Step 1: 在 AppLayout.tsx 顶部添加注释标记废弃**

```tsx
/**
 * @deprecated 路由已重构为 HomePage + StudioLayout
 * 此文件保留作为组件参考，不再被路由引用。
 */
```

---

## Phase 6: Verification — 编译 + 集成测试

### Task 16: 全量编译与类型检查

- [ ] **Step 1: TypeScript 编译检查**

Run: `cd client && npx tsc --noEmit --pretty`

Expected: 0 errors

- [ ] **Step 2: Vite 构建检查**

Run: `cd client && npx vite build`

Expected: build 成功，无错误

---

### Task 17: 开发服务器 + E2E 功能回归

- [ ] **Step 1: 启动后端**

```bash
cd server && npm run dev
```

- [ ] **Step 2: 启动前端**

```bash
cd client && npx vite --port 5173
```

- [ ] **Step 3: 路由验证**
  - 访问 `http://localhost:5173/` → 主页黑白调，讨论预览，星空背景，仓鼠
  - 访问 `http://localhost:5173/discussions` → 演播厅三栏，讨论列表
  - 点击创建讨论 → 弹窗 → 生成嘉宾 → 确认 → 跳转 `/discussion/:id`

- [ ] **Step 4: 功能全流程**
  - 创建讨论 → 输入话题 → 调整专家数量 → 生成 → 确认嘉宾 → 进入讨论室
  - SSE 实时 Transcript 推送正常显示
  - 共识/分歧面板正常更新
  - 删除讨论弹窗正常

- [ ] **Step 5: 响应式验证**

在 Chrome DevTools 中模拟以下宽度：
- 320px（手机竖屏）：三栏变单栏 + 底部栏
- 768px（平板）：三栏可见，Drawer 可用
- 1440px（笔记本）：三栏均衡
- 1920px（台式）：无极宽度正常

- [ ] **Step 6: reduced-motion 验证**

在 DevTools Rendering 中开启 `prefers-reduced-motion: reduce`，确认所有动画停止。

---

### Task 18: Git 提交

- [ ] **Step 1: 展示变更摘要给用户确认**
- [ ] **Step 2: 用户确认后提交**

```bash
git add -A
git status
# user reviews diff before commit
git commit -m "ui: full visual redesign — homepage, studio, modals with taste-skill + impeccable"
```
