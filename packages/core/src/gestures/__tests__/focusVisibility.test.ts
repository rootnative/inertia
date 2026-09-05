import { Platform } from 'react-native'

// `focusVisibility` reads `Platform.OS` at call time. Each test resets the
// module so the lazy `Platform.OS` branch is re-evaluated against the chosen
// platform. We don't exercise the DOM-listener wiring here (no jsdom in the
// test env); the internal `__resetFocusVisibilityForTests` hook stands in for
// "the document fired a keydown / pointerdown."

beforeEach(() => {
  jest.resetModules()
})

describe('isFocusVisible — native', () => {
  it('always returns true (focus is keyboard-equivalent on native)', () => {
    Object.defineProperty(Platform, 'OS', { value: 'ios', configurable: true })
    const { isFocusVisible, __resetFocusVisibilityForTests } =
      require('../focusVisibility') as typeof import('../focusVisibility')

    expect(isFocusVisible()).toBe(true)
    // Native short-circuits before the modality flag is read, so even
    // "pointer modality" still reports visible.
    __resetFocusVisibilityForTests('pointer')
    expect(isFocusVisible()).toBe(true)
  })
})

describe('isFocusVisible — web modality tracking', () => {
  beforeEach(() => {
    Object.defineProperty(Platform, 'OS', { value: 'web', configurable: true })
  })

  it('defaults to keyboard so autofocus / programmatic focus shows a ring', () => {
    const { isFocusVisible } =
      require('../focusVisibility') as typeof import('../focusVisibility')
    expect(isFocusVisible()).toBe(true)
  })

  it('reports false after a pointer event', () => {
    const { isFocusVisible, __resetFocusVisibilityForTests } =
      require('../focusVisibility') as typeof import('../focusVisibility')
    __resetFocusVisibilityForTests('pointer')
    expect(isFocusVisible()).toBe(false)
  })

  it('reports true again after a key event', () => {
    const { isFocusVisible, __resetFocusVisibilityForTests } =
      require('../focusVisibility') as typeof import('../focusVisibility')
    __resetFocusVisibilityForTests('pointer')
    expect(isFocusVisible()).toBe(false)
    __resetFocusVisibilityForTests('keyboard')
    expect(isFocusVisible()).toBe(true)
  })

  it('does not touch the document at import — the package is sideEffects: false', () => {
    const addEventListener = jest.fn()
    ;(globalThis as { document?: unknown }).document = { addEventListener }
    try {
      require('../focusVisibility')
      expect(addEventListener).not.toHaveBeenCalled()
    } finally {
      delete (globalThis as { document?: unknown }).document
    }
  })

  it('installFocusVisibility attaches the listeners once, before any isFocusVisible call', () => {
    // The click that focuses a gesture-wired element lands on an element
    // that is already mounted, so a mount-time install observes the
    // mousedown that precedes the focus. If the listeners only attached
    // inside that focus dispatch, the mousedown would go unobserved and the
    // default keyboard modality would draw a focus ring for a pointer
    // interaction.
    const listeners = new Map<string, (event: unknown) => void>()
    const addEventListener = jest.fn(
      (type: string, fn: (event: unknown) => void) => {
        listeners.set(type, fn)
      },
    )
    ;(globalThis as { document?: unknown }).document = { addEventListener }
    try {
      const { installFocusVisibility, isFocusVisible } =
        require('../focusVisibility') as typeof import('../focusVisibility')

      installFocusVisibility()
      installFocusVisibility()
      // Idempotent: four listeners, attached once.
      expect(addEventListener).toHaveBeenCalledTimes(4)
      expect(Array.from(listeners.keys()).sort()).toEqual([
        'keydown',
        'mousedown',
        'pointerdown',
        'touchstart',
      ])

      // The click-that-focuses sequence: mousedown flips modality before
      // the focus handler reads it.
      listeners.get('mousedown')!({})
      expect(isFocusVisible()).toBe(false)
      listeners.get('keydown')!({})
      expect(isFocusVisible()).toBe(true)
    } finally {
      delete (globalThis as { document?: unknown }).document
    }
  })
})
