import { useEffect } from 'react'
import { Outlet, useParams } from 'react-router-dom'
import { useAppStore } from '../../stores/appStore'
import { DiscussionList } from '../discussion/DiscussionList'
import { CreateDiscussionModal } from '../discussion/CreateDiscussionModal'
import { Drawer } from './Drawer'
import { MenuIcon, UsersIcon } from './Icons'
import { useState } from 'react'

export function AppLayout() {
  const { id } = useParams<{ id?: string }>()
  const { fetchDiscussions, createModalOpen, openCreateModal, closeCreateModal, setActiveDiscussion } = useAppStore()
  const [leftOpen, setLeftOpen] = useState(false)
  const [rightOpen, setRightOpen] = useState(false)
  const isRoom = !!id

  useEffect(() => {
    fetchDiscussions()
  }, [fetchDiscussions])

  // 同步 URL 中的讨论 ID 到高亮状态（覆盖直接 URL 访问/刷新场景）
  useEffect(() => {
    if (id) setActiveDiscussion(id)
  }, [id, setActiveDiscussion])

  return (
    <div className="h-full w-full flex bg-bg-deep dot-grid">
      {/* === 超宽屏：左侧固定栏 === */}
      <aside className="hidden md:flex w-[280px] lg:w-[300px] flex-col border-r border-border-glow glass-panel shrink-0">
        <DiscussionList onNewDiscussion={openCreateModal} />
      </aside>

      {/* === 主舞台 === */}
      <main className="flex-1 flex flex-col min-w-0">
        <Outlet />
        {!isRoom && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center animate-fade-in-up">
              <div className="text-6xl mb-6">🎙️</div>
              <h1 className="text-2xl font-bold text-text-primary mb-2">
                AI Panel Studio
              </h1>
              <p className="text-text-dim mb-8">
                选择一场讨论，或发起新的圆桌会议
              </p>
              <button
                onClick={openCreateModal}
                className="px-6 py-3 bg-accent-cyan text-black font-semibold rounded-lg
                           hover:shadow-[0_0_20px_rgba(0,229,255,0.4)] transition-shadow cursor-pointer"
              >
                发起新讨论
              </button>
            </div>
          </div>
        )}
      </main>

      {/* === 超宽屏：右侧专家栏 === */}
      {isRoom && (
        <aside className="hidden md:flex w-[320px] lg:w-[340px] flex-col border-l border-border-glow glass-panel shrink-0">
          <PanelistPanelTrigger />
        </aside>
      )}

      {/* === 窄屏：底部触发栏 === */}
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

      {/* === 抽屉 === */}
      <Drawer side="left" open={leftOpen} onClose={() => setLeftOpen(false)}>
        <DiscussionList onNewDiscussion={openCreateModal} />
      </Drawer>

      <Drawer side="right" open={rightOpen} onClose={() => setRightOpen(false)}>
        <PanelistPanelTrigger />
      </Drawer>

      {/* === 创建讨论弹窗 === */}
      {createModalOpen && <CreateDiscussionModal onClose={closeCreateModal} />}
    </div>
  )
}

function PanelistPanelTrigger() {
  const { id } = useParams<{ id: string }>()
  // 延迟导入专家面板，避免循环依赖
  return id ? <PanelistPanelInline discussionId={id} /> : null
}

// 在 AppLayout 内联使用
import { PanelistSidebar } from '../panelist/PanelistSidebar'
function PanelistPanelInline({ discussionId }: { discussionId: string }) {
  return <PanelistSidebar discussionId={discussionId} />
}
