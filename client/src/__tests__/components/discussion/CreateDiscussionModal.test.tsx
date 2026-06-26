import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { act } from '@testing-library/react'
import { useAppStore } from '../../../stores/appStore'
import { CreateDiscussionModal } from '../../../components/discussion/CreateDiscussionModal'

beforeEach(() => {
  vi.restoreAllMocks()
  act(() => {
    useAppStore.setState({
      discussions: [],
      loading: false,
      activeDiscussionId: null,
      createModalOpen: false,
    })
  })
})

function renderModal(onClose = vi.fn()) {
  return render(
    <MemoryRouter>
      <CreateDiscussionModal onClose={onClose} />
    </MemoryRouter>
  )
}

describe('CreateDiscussionModal', () => {
  it('shows "发起新讨论" title on step 1', () => {
    renderModal()
    expect(screen.getByText('发起新讨论')).toBeInTheDocument()
  })

  it('renders topic textarea and expert slider', () => {
    renderModal()
    expect(screen.getByPlaceholderText('输入你想要讨论的话题...')).toBeInTheDocument()
    // Expert count slider
    const slider = document.querySelector('input[type="range"]')!
    expect(slider).toBeInTheDocument()
    expect(slider.getAttribute('min')).toBe('2')
    expect(slider.getAttribute('max')).toBe('8')
  })

  it('defaults to 4 experts', () => {
    renderModal()
    expect(screen.getByText('4 人')).toBeInTheDocument()
  })

  it('"生成嘉宾阵容" button is disabled when topic is empty', () => {
    renderModal()
    const generateBtn = screen.getByText('生成嘉宾阵容').closest('button')!
    expect(generateBtn).toBeDisabled()
  })

  it('"生成嘉宾阵容" button is enabled when topic has text', async () => {
    renderModal()
    const textarea = screen.getByPlaceholderText('输入你想要讨论的话题...')
    await userEvent.type(textarea, 'AI 的未来')
    const generateBtn = screen.getByText('生成嘉宾阵容').closest('button')!
    expect(generateBtn).not.toBeDisabled()
  })

  it('calls onClose when close button clicked', async () => {
    const onClose = vi.fn()
    renderModal(onClose)
    // Click X button (the CloseIcon in the header)
    const closeBtn = document.querySelector('.cursor-pointer[class*="hover:bg-white/10"]')!
    await userEvent.click(closeBtn)
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('calls onClose when 取消 button clicked', async () => {
    const onClose = vi.fn()
    renderModal(onClose)
    await userEvent.click(screen.getByText('取消'))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('shows error message when API fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValueOnce(new Error('Network error'))
    )

    renderModal()
    const textarea = screen.getByPlaceholderText('输入你想要讨论的话题...')
    await userEvent.type(textarea, 'Test topic')
    await userEvent.click(screen.getByText('生成嘉宾阵容'))

    await waitFor(() => {
      // Error from new Error('Network error') shows e.message
      expect(screen.getByText(/Network error/)).toBeInTheDocument()
    })
  })

  it('moves to confirm step on successful API response', async () => {
    const mockPanelists = [
      { id: 'host-1', name: '主持人', role: 'host', title: '圆桌主持人', stance: '中立', color: '#00e5ff', status: 'standby', focus: '', discussion_id: 'd-new' },
      { id: 'exp-1', name: '张教授', role: 'expert', title: 'AI 研究员', stance: '支持监管', color: '#e040fb', status: 'standby', focus: '', discussion_id: 'd-new' },
    ]

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ id: 'd-new', panelists: mockPanelists }),
      })
    )

    renderModal()
    const textarea = screen.getByPlaceholderText('输入你想要讨论的话题...')
    await userEvent.type(textarea, 'AI Safety')
    await userEvent.click(screen.getByText('生成嘉宾阵容'))

    await waitFor(() => {
      expect(screen.getByText('确认嘉宾阵容')).toBeInTheDocument()
      // "主持人" appears as panelist name AND role badge — use getAllByText
      const hostElements = screen.getAllByText('主持人')
      expect(hostElements.length).toBeGreaterThanOrEqual(2)
      expect(screen.getByText('张教授')).toBeInTheDocument()
    })
  })
})
