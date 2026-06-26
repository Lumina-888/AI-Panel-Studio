# Modal Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign three level-3 modals with refined spacing, nested content cards, guest card left color bars, and SlideButton justify-evenly layout.

**Architecture:** Pure JSX/CSS restructuring of two existing files. No logic, state management, or API changes. All three modals share the same unified framework: glass-panel shell → title bar → inner content card → border-t separator → evenly-spaced SlideButtons.

**Tech Stack:** React 19, TypeScript, Tailwind CSS v4

## Global Constraints

- Zero logic/storage/API changes — only JSX structure and Tailwind class names
- SlideButton component is NOT modified
- All user-facing text remains Chinese
- Responsive: `max-w-[92vw]` on all modal panels
- Existing `glass-panel`, `animate-fade-in-up`, `border-glow` CSS classes reused as-is
- No new CSS classes or style.css changes needed (all Tailwind inline)

---

### Task 1: Redesign CreateDiscussionModal

**Files:**
- Modify: `client/src/components/discussion/CreateDiscussionModal.tsx`

**Interfaces:**
- Consumes: `SlideButton` from `../common/SlideButton`, `OrbitLoader` from `../common/OrbitLoader`, `CloseIcon` from `../layout/Icons`, `useAppStore` from `../../stores/appStore`, `Panelist` from `../../types`
- Produces: No exported API changes. Same `Props { onClose: () => void }` interface.

- [ ] **Step 1: Replace the entire component JSX**

Replace the return statement (lines 65-191) with the redesigned layout:

```tsx
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
              <SlideButton onClick={onClose} variant="default">
                取消
              </SlideButton>
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
              <SlideButton onClick={() => setStep('input')} variant="default">
                返回修改
              </SlideButton>
              <SlideButton onClick={handleConfirm} variant="primary">
                确认，开始讨论
              </SlideButton>
            </div>
          </>
        )}
      </div>
    </div>
  )
```

- [ ] **Step 2: Verify the file compiles**

Run: `cd client && npx tsc --noEmit --pretty`
Expected: No new TypeScript errors.

- [ ] **Step 3: Commit**

```bash
git add client/src/components/discussion/CreateDiscussionModal.tsx
git commit -m "ui: redesign CreateDiscussionModal with refined spacing and guest cards"
```

---

### Task 2: Redesign delete confirmation modal in DiscussionList

**Files:**
- Modify: `client/src/components/discussion/DiscussionList.tsx` (lines 128-154)

**Interfaces:**
- Consumes: `SlideButton` from `../common/SlideButton`, `CloseIcon` from `../layout/Icons`
- Produces: No changes. Same `Props { onNewDiscussion: () => void }` interface.

- [ ] **Step 1: Replace the delete modal JSX**

Replace lines 128-154 (the `deleteTarget && (...)` block) with:

```tsx
      {/* 删除确认弹窗 */}
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
              <SlideButton onClick={() => setDeleteTarget(null)} variant="default">
                取消
              </SlideButton>
              <SlideButton onClick={handleDelete} variant="danger">
                确认删除
              </SlideButton>
            </div>
          </div>
        </div>
      )}
```

- [ ] **Step 2: Verify the file compiles**

Run: `cd client && npx tsc --noEmit --pretty`
Expected: No new TypeScript errors.

- [ ] **Step 3: Commit**

```bash
git add client/src/components/discussion/DiscussionList.tsx
git commit -m "ui: redesign delete confirmation modal with unified framework"
```
