import { useEffect, type ReactNode } from 'react'

interface Props {
  side: 'left' | 'right'
  open: boolean
  onClose: () => void
  children: ReactNode
}

export function Drawer({ side, open, onClose, children }: Props) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
      return () => { document.body.style.overflow = '' }
    }
  }, [open])

  if (!open) return null

  const isLeft = side === 'left'

  return (
    <div className="md:hidden fixed inset-0 z-50">
      {/* 遮罩 */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* 抽屉 */}
      <div
        className={`absolute top-0 bottom-12 w-[300px] max-w-[85vw] glass-panel
                    ${isLeft ? 'left-0 rounded-r-xl' : 'right-0 rounded-l-xl'}
                    animate-${isLeft ? 'slideInLeft' : 'slideInRight'}`}
        style={{
          animation: `${isLeft ? 'slideInLeft' : 'slideInRight'} 0.3s ease-out`,
        }}
      >
        <div className="p-4 h-full overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  )
}
