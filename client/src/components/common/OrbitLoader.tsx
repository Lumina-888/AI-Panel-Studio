interface OrbitLoaderProps {
  size?: number
  color?: string
  speed?: number
  className?: string
}

export function OrbitLoader({
  size = 35,
  color = '#5D3FD3',
  speed = 0.8,
  className = '',
}: OrbitLoaderProps) {
  return (
    <div
      className={`ol-loader ${className}`}
      style={{
        '--ol-size': `${size}px`,
        '--ol-speed': `${speed}s`,
        '--ol-color': color,
        width: size,
        height: size,
      } as React.CSSProperties}
    >
      <div className="ol-dot" />
      <div className="ol-dot" />
      <div className="ol-dot" />
    </div>
  )
}

export default OrbitLoader
