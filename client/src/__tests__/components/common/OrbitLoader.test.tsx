import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { OrbitLoader } from '../../../components/common/OrbitLoader'

describe('OrbitLoader', () => {
  it('renders 3 orbit dots', () => {
    const { container } = render(<OrbitLoader />)
    const dots = container.querySelectorAll('.ol-dot')
    expect(dots).toHaveLength(3)
  })

  it('applies custom size', () => {
    const { container } = render(<OrbitLoader size={50} />)
    const loader = container.firstChild as HTMLElement
    expect(loader.style.getPropertyValue('--ol-size')).toBe('50px')
  })

  it('applies custom color', () => {
    const { container } = render(<OrbitLoader color="#ff0000" />)
    const loader = container.firstChild as HTMLElement
    expect(loader.style.getPropertyValue('--ol-color')).toBe('#ff0000')
  })

  it('applies custom speed', () => {
    const { container } = render(<OrbitLoader speed={1.5} />)
    const loader = container.firstChild as HTMLElement
    expect(loader.style.getPropertyValue('--ol-speed')).toBe('1.5s')
  })

  it('applies custom className', () => {
    const { container } = render(<OrbitLoader className="my-orbit" />)
    expect(container.firstChild).toHaveClass('my-orbit')
  })
})
