import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PulseDot } from '../../../components/common/PulseDot'

describe('PulseDot', () => {
  it('renders with role="status"', () => {
    render(<PulseDot status="active" />)
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('renders "active" status with green color', () => {
    render(<PulseDot status="active" />)
    const dot = screen.getByRole('status')
    expect(dot).toHaveAttribute('aria-label', '运行中')
    expect(dot.style.backgroundColor).toBe('rgb(0, 230, 118)') // #00e676
  })

  it('renders "waiting" status with white color', () => {
    render(<PulseDot status="waiting" />)
    const dot = screen.getByRole('status')
    expect(dot).toHaveAttribute('aria-label', '等待中')
    expect(dot.style.backgroundColor).toBe('rgb(255, 255, 255)') // #ffffff
  })

  it('renders "ended" status with gray color and no animation', () => {
    render(<PulseDot status="ended" />)
    const dot = screen.getByRole('status')
    expect(dot).toHaveAttribute('aria-label', '已结束')
    expect(dot.style.backgroundColor).toBe('rgb(85, 85, 85)') // #555555
    expect(dot.style.animation).toBe('none')
    expect(dot.style.boxShadow).toBe('none')
  })

  it('has animation for non-ended status', () => {
    render(<PulseDot status="active" />)
    const dot = screen.getByRole('status')
    expect(dot.style.animation).toContain('pulseGlow')
    expect(dot.style.boxShadow).not.toBe('none')
  })

  it('applies custom className', () => {
    render(<PulseDot status="active" className="my-dot" />)
    expect(screen.getByRole('status')).toHaveClass('my-dot')
  })
})
