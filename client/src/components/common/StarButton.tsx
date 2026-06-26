import React from 'react'

interface StarButtonProps {
  children?: React.ReactNode
  onClick?: () => void
  className?: string
  disabled?: boolean
}

const StarSVG: React.FC = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    xmlSpace="preserve"
    version="1.1"
    style={{
      shapeRendering: 'geometricPrecision' as const,
      textRendering: 'geometricPrecision' as const,
      fillRule: 'evenodd' as const,
      clipRule: 'evenodd' as const,
    } as React.CSSProperties}
    viewBox="0 0 784.11 815.53"
  >
    <g>
      <path
        className="sb-star-fill"
        d="M392.05 0c-20.9,210.08 -184.06,378.41 -392.05,407.78 207.96,29.37 371.12,197.68 392.05,407.74 20.93,-210.06 184.09,-378.37 392.05,-407.74 -207.98,-29.38 -371.16,-197.69 -392.06,-407.78z"
      />
    </g>
  </svg>
)

const STAR_POSITIONS = [
  { className: 'sb-star-1', width: 25 },
  { className: 'sb-star-2', width: 15 },
  { className: 'sb-star-3', width: 5 },
  { className: 'sb-star-4', width: 8 },
  { className: 'sb-star-5', width: 15 },
  { className: 'sb-star-6', width: 5 },
]

export function StarButton({
  children = 'Button',
  onClick,
  className = '',
  disabled = false,
}: StarButtonProps) {
  return (
    <button
      className={`sb-button ${className}`}
      onClick={onClick}
      disabled={disabled}
      type="button"
    >
      {children}
      {STAR_POSITIONS.map((star) => (
        <div key={star.className} className={star.className}>
          <StarSVG />
        </div>
      ))}
    </button>
  )
}

export default StarButton
