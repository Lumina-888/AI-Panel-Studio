import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { StarButton } from '../../../components/common/StarButton'

describe('StarButton', () => {
  it('renders children text', () => {
    render(<StarButton>新讨论</StarButton>)
    expect(screen.getByRole('button', { name: '新讨论' })).toBeInTheDocument()
  })

  it('defaults to "Button" text when no children', () => {
    render(<StarButton />)
    expect(screen.getByRole('button', { name: 'Button' })).toBeInTheDocument()
  })

  it('calls onClick when clicked', async () => {
    const onClick = vi.fn()
    render(<StarButton onClick={onClick}>点击</StarButton>)
    await userEvent.click(screen.getByRole('button'))
    expect(onClick).toHaveBeenCalledOnce()
  })

  it('supports disabled state', () => {
    render(<StarButton disabled>禁用</StarButton>)
    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('does not call onClick when disabled', async () => {
    const onClick = vi.fn()
    render(<StarButton onClick={onClick} disabled>禁用</StarButton>)
    await userEvent.click(screen.getByRole('button'))
    expect(onClick).not.toHaveBeenCalled()
  })

  it('renders 6 star SVG elements', () => {
    const { container } = render(<StarButton />)
    // Each star position is a div containing an SVG; count the SVG elements
    const svgStars = container.querySelectorAll('.sb-star-1, .sb-star-2, .sb-star-3, .sb-star-4, .sb-star-5, .sb-star-6')
    expect(svgStars).toHaveLength(6)
  })

  it('has type="button"', () => {
    render(<StarButton />)
    expect(screen.getByRole('button')).toHaveAttribute('type', 'button')
  })
})
