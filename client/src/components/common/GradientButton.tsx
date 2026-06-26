import React from 'react'

interface GradientButtonProps {
  children?: React.ReactNode
  onClick?: () => void
  className?: string
  disabled?: boolean
  type?: 'button' | 'submit' | 'reset'
}

export function GradientButton({
  children = 'Download',
  onClick,
  className = '',
  disabled = false,
  type = 'button',
}: GradientButtonProps) {
  return (
    <button
      className={`gradient-button ${className}`}
      onClick={onClick}
      disabled={disabled}
      type={type}
    >
      <span className="gradient-button-content">{children}</span>
    </button>
  )
}

export default GradientButton
