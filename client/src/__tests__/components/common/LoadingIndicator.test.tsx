import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { LoadingIndicator } from '../../../components/common/LoadingIndicator'

describe('LoadingIndicator', () => {
  it('returns null when visible is false', () => {
    const { container } = render(<LoadingIndicator visible={false} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders 4 circles when visible', () => {
    render(<LoadingIndicator visible />)
    // Check for the container div with the flex display
    const circles = document.querySelectorAll('.animate-circle-pulse')
    expect(circles).toHaveLength(4)
  })

  it('applies custom className when visible', () => {
    const { container } = render(<LoadingIndicator className="my-loader" />)
    expect(container.firstChild).toHaveClass('my-loader')
  })

  it('each circle has staggered animation delay', () => {
    render(<LoadingIndicator visible />)
    const circles: HTMLElement[] = Array.from(document.querySelectorAll('.animate-circle-pulse'))
    expect(parseFloat(circles[0].style.animationDelay)).toBeCloseTo(0, 1)
    expect(parseFloat(circles[1].style.animationDelay)).toBeCloseTo(0.3, 1)
    expect(parseFloat(circles[2].style.animationDelay)).toBeCloseTo(0.6, 1)
    expect(parseFloat(circles[3].style.animationDelay)).toBeCloseTo(0.9, 1)
  })
})
