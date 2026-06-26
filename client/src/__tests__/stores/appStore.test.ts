import { describe, it, expect, vi, beforeEach } from 'vitest'
import { act } from '@testing-library/react'
import { useAppStore } from '../../stores/appStore'

// Helper: reset store to initial state
function resetStore() {
  act(() => {
    useAppStore.setState({
      discussions: [],
      loading: false,
      activeDiscussionId: null,
      createModalOpen: false,
    })
  })
}

beforeEach(() => {
  vi.restoreAllMocks()
  resetStore()
})

// ===== 初始状态 =====

describe('appStore — initial state', () => {
  it('discussions is empty array', () => {
    expect(useAppStore.getState().discussions).toEqual([])
  })

  it('loading is false', () => {
    expect(useAppStore.getState().loading).toBe(false)
  })

  it('activeDiscussionId is null', () => {
    expect(useAppStore.getState().activeDiscussionId).toBeNull()
  })

  it('createModalOpen is false', () => {
    expect(useAppStore.getState().createModalOpen).toBe(false)
  })
})

// ===== fetchDiscussions =====

describe('appStore — fetchDiscussions', () => {
  it('sets loading true and fetches discussion list', async () => {
    const mockData = [
      {
        id: 'd1',
        topic: 'AI Safety',
        expert_count: 4,
        status: 'live',
        created_at: '2025-01-01T00:00:00Z',
        panelists: [{ id: 'p1' }, { id: 'p2' }, { id: 'p3' }, { id: 'p4' }],
        message_count: 10,
        pinned_at: null,
      },
      {
        id: 'd2',
        topic: 'Climate Change',
        expert_count: 3,
        status: 'pending',
        created_at: '2025-01-02T00:00:00Z',
        panelists: [],
        message_count: 0,
        pinned_at: '2025-01-03T00:00:00Z',
      },
    ]

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValueOnce({
        json: () => Promise.resolve(mockData),
      })
    )

    await act(async () => {
      await useAppStore.getState().fetchDiscussions()
    })

    const state = useAppStore.getState()
    expect(state.loading).toBe(false)
    expect(state.discussions).toHaveLength(2)
    expect(state.discussions[0]).toMatchObject({
      id: 'd1',
      topic: 'AI Safety',
      expert_count: 4,
      status: 'live',
      panelist_count: 4,
      message_count: 10,
      pinned_at: null,
    })
    expect(state.discussions[1]).toMatchObject({
      id: 'd2',
      topic: 'Climate Change',
      expert_count: 3,
      status: 'pending',
      panelist_count: 0,
      message_count: 0,
      pinned_at: '2025-01-03T00:00:00Z',
    })
  })

  it('handles API response with discussions wrapper', async () => {
    const mockList = [{ id: 'd3', topic: 'AI', expert_count: 2, status: 'pending', created_at: '2025-01-01T00:00:00Z', panelists: [], message_count: 0 }]

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValueOnce({
        json: () => Promise.resolve({ discussions: mockList }),
      })
    )

    await act(async () => {
      await useAppStore.getState().fetchDiscussions()
    })

    const state = useAppStore.getState()
    expect(state.discussions).toHaveLength(1)
    expect(state.discussions[0].id).toBe('d3')
  })

  it('sets loading false even on fetch error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValueOnce(new Error('Network error'))
    )

    await act(async () => {
      try {
        await useAppStore.getState().fetchDiscussions()
      } catch {
        // expected — store doesn't catch fetch errors
      }
    })

    expect(useAppStore.getState().loading).toBe(false)
  })
})

// ===== setActiveDiscussion =====

describe('appStore — setActiveDiscussion', () => {
  it('sets activeDiscussionId', () => {
    act(() => {
      useAppStore.getState().setActiveDiscussion('d1')
    })
    expect(useAppStore.getState().activeDiscussionId).toBe('d1')
  })

  it('can clear activeDiscussionId with null', () => {
    act(() => {
      useAppStore.getState().setActiveDiscussion('d1')
    })
    act(() => {
      useAppStore.getState().setActiveDiscussion(null)
    })
    expect(useAppStore.getState().activeDiscussionId).toBeNull()
  })
})

// ===== createModal =====

describe('appStore — create modal', () => {
  it('openCreateModal sets createModalOpen to true', () => {
    act(() => {
      useAppStore.getState().openCreateModal()
    })
    expect(useAppStore.getState().createModalOpen).toBe(true)
  })

  it('closeCreateModal sets createModalOpen to false', () => {
    act(() => {
      useAppStore.getState().openCreateModal()
    })
    act(() => {
      useAppStore.getState().closeCreateModal()
    })
    expect(useAppStore.getState().createModalOpen).toBe(false)
  })
})

// ===== deleteDiscussion =====

describe('appStore — deleteDiscussion', () => {
  it('removes discussion from list after DELETE', async () => {
    useAppStore.setState({
      discussions: [
        { id: 'd1', topic: 'Topic 1', expert_count: 2, status: 'live', created_at: '', panelist_count: 2, message_count: 5, pinned_at: null },
        { id: 'd2', topic: 'Topic 2', expert_count: 3, status: 'pending', created_at: '', panelist_count: 0, message_count: 0, pinned_at: null },
      ],
    })

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValueOnce({ json: () => Promise.resolve({}) })
    )

    await act(async () => {
      await useAppStore.getState().deleteDiscussion('d1')
    })

    const state = useAppStore.getState()
    expect(state.discussions).toHaveLength(1)
    expect(state.discussions[0].id).toBe('d2')
  })

  it('clears activeDiscussionId when deleting active discussion', async () => {
    useAppStore.setState({
      discussions: [{ id: 'd1', topic: 'Active', expert_count: 2, status: 'live', created_at: '', panelist_count: 2, message_count: 0, pinned_at: null }],
      activeDiscussionId: 'd1',
    })

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValueOnce({ json: () => Promise.resolve({}) })
    )

    await act(async () => {
      await useAppStore.getState().deleteDiscussion('d1')
    })

    expect(useAppStore.getState().activeDiscussionId).toBeNull()
  })

  it('keeps activeDiscussionId when deleting a different discussion', async () => {
    useAppStore.setState({
      discussions: [
        { id: 'd1', topic: 'A', expert_count: 2, status: 'live', created_at: '', panelist_count: 2, message_count: 0, pinned_at: null },
        { id: 'd2', topic: 'B', expert_count: 2, status: 'live', created_at: '', panelist_count: 2, message_count: 0, pinned_at: null },
      ],
      activeDiscussionId: 'd2',
    })

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValueOnce({ json: () => Promise.resolve({}) })
    )

    await act(async () => {
      await useAppStore.getState().deleteDiscussion('d1')
    })

    expect(useAppStore.getState().activeDiscussionId).toBe('d2')
  })
})

// ===== togglePin =====

describe('appStore — togglePin', () => {
  it('calls PATCH /api/discussions/:id/pin and re-fetches', async () => {
    const fetchMock = vi.fn()

    // First call: PATCH (for togglePin)
    fetchMock.mockResolvedValueOnce({
      json: () => Promise.resolve({}),
    })
    // Second call: GET /api/discussions (via fetchDiscussions triggered by togglePin)
    fetchMock.mockResolvedValueOnce({
      json: () => Promise.resolve([{ id: 'd1', topic: 'T', expert_count: 2, status: 'live', created_at: '', panelists: [], message_count: 0 }]),
    })

    vi.stubGlobal('fetch', fetchMock)

    await act(async () => {
      await useAppStore.getState().togglePin('d1', true)
    })

    // Should have called PATCH with correct URL and body
    const patchCall = fetchMock.mock.calls.find((c: any[]) => c[0].includes('/pin'))
    expect(patchCall).toBeDefined()
    expect(patchCall[1].method).toBe('PATCH')
    const body = JSON.parse(patchCall[1].body)
    expect(body.pinned).toBe(true)
  })
})
