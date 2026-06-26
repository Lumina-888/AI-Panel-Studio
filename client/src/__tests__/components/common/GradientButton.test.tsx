import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { GradientButton } from '../../../components/common/GradientButton'

describe('GradientButton', () => {
  it('renders children text', () => {
    render(<GradientButton>点击我</GradientButton>)
    expect(screen.getByRole('button', { name: '点击我' })).toBeInTheDocument()
  })

  it('defaults to "Download" text when no children', () => {
    render(<GradientButton />)
    expect(screen.getByRole('button', { name: 'Download' })).toBeInTheDocument()
  })

  it('calls onClick when clicked', async () => {
    const onClick = vi.fn()
    render(<GradientButton onClick={onClick}>按钮</GradientButton>)
    await userEvent.click(screen.getByRole('button'))
    expect(onClick).toHaveBeenCalledOnce()
  })

  it('supports disabled state', () => {
    render(<GradientButton disabled>禁用</GradientButton>)
    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('does not call onClick when disabled', async () => {
    const onClick = vi.fn()
    render(<GradientButton onClick={onClick} disabled>禁用</GradientButton>)
    await userEvent.click(screen.getByRole('button'))
    expect(onClick).not.toHaveBeenCalled()
  })

  it('sets button type attribute', () => {
    render(<GradientButton type="submit">提交</GradientButton>)
    expect(screen.getByRole('button')).toHaveAttribute('type', 'submit')
  })

  it('applies custom className', () => {
    render(<GradientButton className="custom-class">按钮</GradientButton>)
    expect(screen.getByRole('button')).toHaveClass('custom-class')
  })
})
