import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ExpandCard } from '../../../components/common/ExpandCard'

describe('ExpandCard', () => {
  it('renders title and description', () => {
    render(<ExpandCard title="测试标题" description="测试描述" />)
    expect(screen.getByText('测试标题')).toBeInTheDocument()
    expect(screen.getByText('测试描述')).toBeInTheDocument()
  })

  it('renders with default props when none provided', () => {
    render(<ExpandCard />)
    expect(screen.getByText('Product Name')).toBeInTheDocument()
  })

  it('renders arrow "→"', () => {
    render(<ExpandCard />)
    expect(screen.getByText('→')).toBeInTheDocument()
  })

  it('has role="button" when onClick is provided', () => {
    render(<ExpandCard onClick={vi.fn()} />)
    expect(screen.getByRole('button')).toBeInTheDocument()
  })

  it('does not have role="button" when no onClick', () => {
    render(<ExpandCard />)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('calls onClick when clicked', async () => {
    const onClick = vi.fn()
    render(<ExpandCard onClick={onClick} />)
    await userEvent.click(screen.getByRole('button'))
    expect(onClick).toHaveBeenCalledOnce()
  })

  it('has tabIndex when clickable', () => {
    render(<ExpandCard onClick={vi.fn()} />)
    expect(screen.getByRole('button')).toHaveAttribute('tabIndex', '0')
  })

  it('applies custom className', () => {
    const { container } = render(<ExpandCard className="my-card" />)
    expect(container.firstChild).toHaveClass('my-card')
  })
})
