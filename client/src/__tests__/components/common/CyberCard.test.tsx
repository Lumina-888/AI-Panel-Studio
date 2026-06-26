import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CyberCard } from '../../../components/common/CyberCard'

describe('CyberCard', () => {
  it('renders with default props', () => {
    render(<CyberCard />)
    // Title is split by <br /> so use a function matcher
    expect(screen.getByText((content) => content.includes('CYBER'))).toBeInTheDocument()
    expect(screen.getByText((content) => content.includes('CARD'))).toBeInTheDocument()
    expect(screen.getByText('HOVER ME')).toBeInTheDocument()
  })

  it('renders custom title (single line)', () => {
    render(<CyberCard title="发起新讨论" />)
    expect(screen.getByText('发起新讨论')).toBeInTheDocument()
  })

  it('renders custom title (multi-line with \\n)', () => {
    render(<CyberCard title="Line1\nLine2" />)
    expect(screen.getByText((content) => content.includes('Line1'))).toBeInTheDocument()
    expect(screen.getByText((content) => content.includes('Line2'))).toBeInTheDocument()
  })

  it('renders custom subtitle and highlight', () => {
    render(<CyberCard subtitle="AI" highlight="讨论" />)
    expect(screen.getByText('AI')).toBeInTheDocument()
    expect(screen.getByText('讨论')).toBeInTheDocument()
  })

  it('renders custom prompt', () => {
    render(<CyberCard prompt="点我发起" />)
    expect(screen.getByText('点我发起')).toBeInTheDocument()
  })

  it('renders 25 tracker elements', () => {
    const { container } = render(<CyberCard />)
    const trackers = container.querySelectorAll('.cc-tracker')
    expect(trackers).toHaveLength(25)
  })

  it('applies custom className', () => {
    const { container } = render(<CyberCard className="my-cyber" />)
    expect(container.firstChild).toHaveClass('my-cyber')
  })
})
