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
