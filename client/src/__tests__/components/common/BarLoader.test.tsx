import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { BarLoader } from '../../../components/common/BarLoader'

describe('BarLoader', () => {
  it('renders 5 bars', () => {
    const { container } = render(<BarLoader />)
    const bars = container.querySelectorAll('.bl-bar')
    expect(bars).toHaveLength(5)
  })

  it('applies default height 50', () => {
    const { container } = render(<BarLoader />)
    const loader = container.firstChild as HTMLElement
    expect(loader.style.height).toBe('50px')
  })

  it('applies custom height', () => {
    const { container } = render(<BarLoader height={36} />)
    const loader = container.firstChild as HTMLElement
    expect(loader.style.height).toBe('36px')
  })

  it('applies custom className', () => {
    const { container } = render(<BarLoader className="my-bar" />)
    expect(container.firstChild).toHaveClass('my-bar')
  })

  it('bars have staggered animation delays', () => {
    const { container } = render(<BarLoader />)
    const bars = container.querySelectorAll('.bl-bar')
    const delays = Array.from(bars).map(
      (bar) => (bar as HTMLElement).style.animationDelay
    )
    // Should be negative staggered delays
    expect(delays).toHaveLength(5)
    expect(delays[0]).toBe('-0.9s')
  })
})
