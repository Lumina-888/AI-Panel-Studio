import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { act } from '@testing-library/react'
import { useDiscussionStore } from '../../../stores/discussionStore'
import { ConsensusDivergencePanel } from '../../../components/consensus/ConsensusDivergencePanel'
import type { ConsensusPoint, DivergencePoint } from '../../../types'

beforeEach(() => {
  act(() => {
    useDiscussionStore.setState({
      consensusPoints: [],
      divergencePoints: [],
    })
  })
})

function makeConsensus(overrides: Partial<ConsensusPoint> = {}): ConsensusPoint {
  return {
    id: 'c1',
    discussion_id: 'd1',
    content: '各方一致认为AI需要监管。',
    confidence: 0.85,
    updated_at: '',
    ...overrides,
  }
}

function makeDivergence(overrides: Partial<DivergencePoint> = {}): DivergencePoint {
  return {
    id: 'dv1',
    discussion_id: 'd1',
    content: '对监管力度存在分歧',
    perspectives: ['严格监管', '宽松监管', '行业自律'],
    updated_at: '',
    ...overrides,
  }
}

describe('ConsensusDivergencePanel', () => {
  it('shows 共识 tab active by default', () => {
    render(<ConsensusDivergencePanel />)
    expect(screen.getByText(/✓ 共识/)).toBeInTheDocument()
    expect(screen.getByText(/⚡ 分歧/)).toBeInTheDocument()
    expect(screen.getByText('等待共识产生...')).toBeInTheDocument()
  })

  it('shows divergence content when switching tab', async () => {
    act(() => {
      useDiscussionStore.setState({
        divergencePoints: [makeDivergence()],
      })
    })
    render(<ConsensusDivergencePanel />)

    await userEvent.click(screen.getByText(/⚡ 分歧/))
    expect(screen.getByText('对监管力度存在分歧')).toBeInTheDocument()
    expect(screen.getByText('严格监管')).toBeInTheDocument()
    expect(screen.getByText('宽松监管')).toBeInTheDocument()
    expect(screen.getByText('行业自律')).toBeInTheDocument()
  })

  it('renders consensus points with confidence bar', () => {
    act(() => {
      useDiscussionStore.setState({
        consensusPoints: [makeConsensus()],
      })
    })
    const { container } = render(<ConsensusDivergencePanel />)

    expect(screen.getByText('各方一致认为AI需要监管。')).toBeInTheDocument()
    // Confidence percentage
    expect(screen.getByText('85%')).toBeInTheDocument()
    // Progress bar exists
    expect(container.querySelector('.bg-accent-cyan.transition-all')).toBeInTheDocument()
  })

  it('shows empty divergence placeholder when on divergence tab', async () => {
    render(<ConsensusDivergencePanel />)
    await userEvent.click(screen.getByText(/⚡ 分歧/))
    expect(screen.getByText('等待分歧浮现...')).toBeInTheDocument()
  })

  it('shows count in tab labels', () => {
    act(() => {
      useDiscussionStore.setState({
        consensusPoints: [makeConsensus(), makeConsensus({ id: 'c2' })],
        divergencePoints: [makeDivergence()],
      })
    })
    render(<ConsensusDivergencePanel />)
    expect(screen.getByText(/✓ 共识 \(2\)/)).toBeInTheDocument()
    expect(screen.getByText(/⚡ 分歧 \(1\)/)).toBeInTheDocument()
  })

  it('has resize handle', () => {
    render(<ConsensusDivergencePanel />)
    const handle = document.querySelector('.cursor-ns-resize')
    expect(handle).toBeInTheDocument()
  })
})
