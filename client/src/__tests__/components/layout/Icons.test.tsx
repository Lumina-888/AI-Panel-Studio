import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { MenuIcon, UsersIcon, PlusIcon, CloseIcon, PinIcon, DeleteIcon } from '../../../components/layout/Icons'

describe('Icons', () => {
  it('MenuIcon renders SVG', () => {
    const { container } = render(<MenuIcon />)
    expect(container.querySelector('svg')).toBeInTheDocument()
    expect(container.querySelector('svg')?.getAttribute('width')).toBe('20')
  })

  it('UsersIcon renders SVG', () => {
    const { container } = render(<UsersIcon />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('PlusIcon renders SVG', () => {
    const { container } = render(<PlusIcon />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('CloseIcon renders SVG', () => {
    const { container } = render(<CloseIcon />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('PinIcon renders unfilled by default', () => {
    const { container } = render(<PinIcon />)
    const svg = container.querySelector('svg')!
    expect(svg.getAttribute('fill')).toBe('none')
  })

  it('PinIcon renders filled when filled=true', () => {
    const { container } = render(<PinIcon filled />)
    const svg = container.querySelector('svg')!
    expect(svg.getAttribute('fill')).toBe('currentColor')
  })

  it('DeleteIcon renders SVG', () => {
    const { container } = render(<DeleteIcon />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })
})
