import '@testing-library/jest-dom/vitest'

// jsdom polyfills
Element.prototype.scrollIntoView = vi.fn()

beforeEach(() => {
  // Stub fetch to throw if not mocked — catches accidental real calls
})

afterEach(() => {
  vi.restoreAllMocks()
})
