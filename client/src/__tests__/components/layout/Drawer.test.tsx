import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Drawer } from '../../../components/layout/Drawer'

describe('Drawer', () => {
  it('returns null when closed', () => {
    const { container } = render(
      <Drawer side="left" open={false} onClose={vi.fn()}>
        <div>内容</div>
      </Drawer>
    )
    expect(container.firstChild).toBeNull()
  })

  it('renders children when open', () => {
    render(
      <Drawer side="left" open onClose={vi.fn()}>
        <div>抽屉内容</div>
      </Drawer>
    )
    expect(screen.getByText('抽屉内容')).toBeInTheDocument()
  })

  it('calls onClose when backdrop is clicked', async () => {
    const onClose = vi.fn()
    render(
      <Drawer side="left" open onClose={onClose}>
        <div>内容</div>
      </Drawer>
    )
    // Click the backdrop (overlay)
    const backdrop = document.querySelector('.bg-black\\/60')!
    await userEvent.click(backdrop)
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('left drawer renders with slideInLeft animation', () => {
    render(
      <Drawer side="left" open onClose={vi.fn()}>
        <div>左</div>
      </Drawer>
    )
    // Check that the drawer panel exists
    const panel = document.querySelector('.glass-panel')!
    expect(panel).toBeInTheDocument()
    expect(panel.style.animation).toContain('slideInLeft')
  })

  it('right drawer renders with slideInRight animation', () => {
    render(
      <Drawer side="right" open onClose={vi.fn()}>
        <div>右</div>
      </Drawer>
    )
    const panel = document.querySelector('.glass-panel')!
    expect(panel.style.animation).toContain('slideInRight')
  })

  it('sets body overflow hidden when open', () => {
    render(
      <Drawer side="left" open onClose={vi.fn()}>
        <div>内容</div>
      </Drawer>
    )
    expect(document.body.style.overflow).toBe('hidden')
  })
})
