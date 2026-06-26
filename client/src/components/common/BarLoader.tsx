interface BarLoaderProps {
  className?: string
  height?: number
}

const BAR_COLORS = ['#4c86f9', '#49a84c', '#f6bb02', '#f6bb02', '#2196f3']

export function BarLoader({ className = '', height = 50 }: BarLoaderProps) {
  return (
    <div className={`bl-loader ${className}`} style={{ height }}>
      {BAR_COLORS.map((color, i) => (
        <span
          key={i}
          className="bl-bar"
          style={{
            background: color,
            animationDelay: `${-(0.9 - i * 0.1)}s`,
            height,
          }}
        />
      ))}
    </div>
  )
}

export default BarLoader
