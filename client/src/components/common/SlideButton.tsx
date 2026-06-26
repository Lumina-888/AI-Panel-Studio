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
