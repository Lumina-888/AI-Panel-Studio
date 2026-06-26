interface HamsterLoaderProps {
  size?: number
  speed?: number
  className?: string
}

export function HamsterLoader({
  size = 14,
  speed = 1,
  className = '',
}: HamsterLoaderProps) {
  return (
    <div
      aria-label="Orange and tan hamster running in a metal wheel"
      role="img"
      className={`hl-wheel ${className}`}
      style={{
        fontSize: `${size}px`,
        '--hl-dur': `${speed}s`,
      } as React.CSSProperties}
    >
      <div className="hl-wheel-rim" />
      <div className="hl-hamster">
        <div className="hl-body">
          <div className="hl-head">
            <div className="hl-ear" />
            <div className="hl-eye" />
            <div className="hl-nose" />
          </div>
          <div className="hl-limb-fr" />
          <div className="hl-limb-fl" />
          <div className="hl-limb-br" />
          <div className="hl-limb-bl" />
          <div className="hl-tail" />
        </div>
      </div>
      <div className="hl-spoke" />
    </div>
  )
}

export default HamsterLoader
