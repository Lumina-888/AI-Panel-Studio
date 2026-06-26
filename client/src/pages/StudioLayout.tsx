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

      {/* 主舞台 — 居中卡片封装二级页面 */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden p-4 md:p-6">
        <div className="flex-1 max-w-[1300px] mx-auto w-full glass-panel rounded-2xl overflow-hidden flex flex-col">
          {isRoom ? (
            <Outlet />
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center animate-fade-in-up">
                <div className="text-5xl mb-5">🎙️</div>
                <h1 className="text-xl font-bold text-text-primary mb-2">AI Panel Studio</h1>
                <p className="text-text-dim">从左侧选择讨论，或发起新的圆桌会议</p>
              </div>
            </div>
          )}
        </div>
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
