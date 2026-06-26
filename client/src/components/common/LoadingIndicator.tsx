interface LoadingIndicatorProps {
  visible?: boolean
  className?: string
}

export function LoadingIndicator({ visible = true, className = '' }: LoadingIndicatorProps) {
  if (!visible) return null

  return (
    <div className={`flex items-center justify-center gap-2.5 ${className}`}>
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          className="relative flex h-5 w-5 items-center justify-center rounded-full border-2 border-accent-cyan bg-transparent animate-circle-pulse"
          style={{ animationDelay: `${i * 0.3}s` }}
        >
          <span
            className="absolute h-4 w-4 rounded-full bg-accent-cyan animate-dot-pulse"
            style={{
              animationDelay: `${i * 0.3}s`,
              transform: 'translate(-50%, -50%)',
            }}
          />
          <span
            className="absolute h-5 w-5 rounded-full animate-outline-ripple"
            style={{
              animationDelay: `${0.9 + i * 0.3}s`,
              transform: 'translate(-50%, -50%)',
            }}
          />
        </div>
      ))}
    </div>
  )
}
