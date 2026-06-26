interface ExpandCardProps {
  title?: string
  description?: string
  className?: string
  onClick?: () => void
}

export function ExpandCard({
  title = 'Product Name',
  description = 'Lorem ipsum dolor sit amet, consectetur adipisicing elit. Quaerat veritatis nobis saepe itaque rerum nostrum aliquid obcaecati odio officia deleniti.',
  className = '',
  onClick,
}: ExpandCardProps) {
  return (
    <div
      className={`ec-card ${className}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <p className="ec-title">{title}</p>
      <p className="ec-desc">{description}</p>
      <div className="ec-corner">
        <div className="ec-arrow">→</div>
      </div>
    </div>
  )
}

export default ExpandCard
