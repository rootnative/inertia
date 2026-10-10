import { Platform } from 'react-native'

// `focusVisibility` reads `Platform.OS` at call time. Each test resets the
// module so the lazy `Platform.OS` branch is re-evaluated against the chosen
// platform. We don't exercise the DOM-listener wiring here (no jsdom in the
// test env); the internal `__resetFocusVisibilityForTests` hook stands in for
// "the document fired a keydown / pointerdown."
//
// The focus targets are fakes, not jsdom elements, on purpose: jsdom matches
// `:focus-visible` on every focused element, so it cannot tell the browser's
// answer from the modality fallback.

interface FakeTarget {
  focused: boolean
  visible: boolean | 'throws'
}

function focusEvent({ focused, visible }: FakeTarget) {
  return {
    target: {
      matches(selector: string): boolean {
        if (selector === ':focus') return focused
        if (selector !== ':focus-visible') {
          throw new Error(`unexpected selector ${selector}`)
        }
        if (visible === 'throws') {
          throw new SyntaxError("':focus-visible' is not a valid selector")
        }
        return visible
      },
    },
  }
}

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
    expect(isFocusVisible(focusEvent({ focused: true, visible: false }))).toBe(
      true,
    )
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

describe('isFocusVisible — web, the browser decides for a focused target', () => {
  beforeEach(() => {
    Object.defineProperty(Platform, 'OS', { value: 'web', configurable: true })
  })

  it('shows the ring that :focus-visible shows after pointer input', () => {
    // Chromium after a click that focuses nothing: a script focus matches
    // `:focus-visible`, and the tracker is in pointer modality.
    const { isFocusVisible, __resetFocusVisibilityForTests } =
      require('../focusVisibility') as typeof import('../focusVisibility')
    __resetFocusVisibilityForTests('pointer')
    expect(isFocusVisible(focusEvent({ focused: true, visible: true }))).toBe(
      true,
    )
  })

  it('hides the ring that :focus-visible hides in keyboard modality', () => {
    const { isFocusVisible, __resetFocusVisibilityForTests } =
      require('../focusVisibility') as typeof import('../focusVisibility')
    __resetFocusVisibilityForTests('keyboard')
    expect(isFocusVisible(focusEvent({ focused: true, visible: false }))).toBe(
      false,
    )
  })

  it('falls back to the modality when the target does not hold focus', () => {
    // A dispatched focus event moves no focus, and the browser then answers
    // `false` for every input.
    const { isFocusVisible, __resetFocusVisibilityForTests } =
      require('../focusVisibility') as typeof import('../focusVisibility')
    const dispatched = focusEvent({ focused: false, visible: false })
    __resetFocusVisibilityForTests('keyboard')
    expect(isFocusVisible(dispatched)).toBe(true)
    __resetFocusVisibilityForTests('pointer')
    expect(isFocusVisible(dispatched)).toBe(false)
  })

  it('falls back to the modality when :focus-visible throws', () => {
    const { isFocusVisible, __resetFocusVisibilityForTests } =
      require('../focusVisibility') as typeof import('../focusVisibility')
    const oldBrowser = focusEvent({ focused: true, visible: 'throws' })
    __resetFocusVisibilityForTests('keyboard')
    expect(isFocusVisible(oldBrowser)).toBe(true)
    __resetFocusVisibilityForTests('pointer')
    expect(isFocusVisible(oldBrowser)).toBe(false)
  })

  it('falls back to the modality when the event has no element target', () => {
    const { isFocusVisible, __resetFocusVisibilityForTests } =
      require('../focusVisibility') as typeof import('../focusVisibility')
    __resetFocusVisibilityForTests('pointer')
    for (const event of [undefined, null, {}, { target: 42 }, { target: {} }]) {
      expect(isFocusVisible(event)).toBe(false)
    }
  })
})

describe('isFocusVisible — web, the modality fallback ignores a modifier chord', () => {
  beforeEach(() => {
    Object.defineProperty(Platform, 'OS', { value: 'web', configurable: true })
  })

  it('stays in pointer modality on ⌘, Ctrl or Alt chords, and leaves on Shift', () => {
    // The W3C polyfill skips a Meta, Control or Alt chord. Chromium agrees:
    // after a click that focuses a control, a ⌘K handler's focus does not
    // match `:focus-visible`, and after Shift alone it does.
    const listeners = new Map<string, (event: unknown) => void>()
    ;(globalThis as { document?: unknown }).document = {
      addEventListener: (type: string, fn: (event: unknown) => void) => {
        listeners.set(type, fn)
      },
    }
    try {
      const { installFocusVisibility, isFocusVisible } =
        require('../focusVisibility') as typeof import('../focusVisibility')
      installFocusVisibility()
      const keydown = listeners.get('keydown')!

      listeners.get('mousedown')!({})
      keydown({ key: 'k', metaKey: true })
      keydown({ key: 'c', ctrlKey: true })
      keydown({ key: 'Tab', altKey: true })
      expect(isFocusVisible()).toBe(false)

      keydown({ key: 'Shift', shiftKey: true })
      expect(isFocusVisible()).toBe(true)
    } finally {
      delete (globalThis as { document?: unknown }).document
    }
  })
})
