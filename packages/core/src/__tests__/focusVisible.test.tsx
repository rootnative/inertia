import { fireEvent, render, screen } from '@testing-library/react-native'
import { cloneElement } from 'react'
import * as Reanimated from 'react-native-reanimated'
import { Motion } from '../motion'
import { renderWithMotion } from '../testing'

// `gesture.focusVisible` should engage only when the input modality reads as
// keyboard, while `gesture.focused` engages on every focus. Under the layered
// blend model, gesture sub-states do NOT replace the base `withTiming` /
// `withSpring` target — instead each layer's progress SV animates 0↔1 and the
// composed value materializes inside the `useAnimatedStyle` worklet. So these
// tests assert the rendered output, not the raw resolver call.

jest.mock('../gestures', () => ({
  isFocusVisible: jest.fn(() => true),
}))

const { isFocusVisible } = jest.requireMock('../gestures') as {
  isFocusVisible: jest.Mock<boolean, []>
}

beforeEach(() => {
  jest.restoreAllMocks()
  isFocusVisible.mockReturnValue(true)
})

function getStyle(
  node: { props: { style?: unknown } } | null,
): Record<string, unknown> {
  if (!node) return {}
  const raw = node.props.style
  const flat = Array.isArray(raw) ? raw.flat(Infinity) : [raw]
  return Object.assign({}, ...flat.filter(Boolean))
}

describe('gesture.focusVisible', () => {
  it('engages on focus when input modality reads as keyboard', () => {
    isFocusVisible.mockReturnValue(true)
    const ui = (
      <Motion.View
        testID="card"
        initial={{ opacity: 1 }}
        animate={{ opacity: 1 }}
        gesture={{
          focused: { opacity: 0.7 },
          focusVisible: { opacity: 0.4 },
        }}
        transition={{ type: 'timing', duration: 100 }}
      />
    )
    const result = renderWithMotion(ui)

    fireEvent(screen.getByTestId('card'), 'focus')
    // Re-render so the worklet re-reads the post-effect progress SVs.
    result.rerender(cloneElement(ui))

    // Both `focused` (0.7) and `focusVisible` (0.4) layer in priority order;
    // `focusVisible` is highest-priority among focus sub-states, so the
    // composed opacity collapses to 0.4 once both progresses settle at 1.
    const style = getStyle(result.toJSON() as never)
    expect(style.opacity).toBeCloseTo(0.4)
  })

  it('does not engage on focus when modality reads as pointer', () => {
    isFocusVisible.mockReturnValue(false)
    const ui = (
      <Motion.View
        testID="card"
        initial={{ opacity: 1 }}
        animate={{ opacity: 1 }}
        gesture={{
          focused: { opacity: 0.7 },
          focusVisible: { opacity: 0.4 },
        }}
        transition={{ type: 'timing', duration: 100 }}
      />
    )
    const result = renderWithMotion(ui)

    fireEvent(screen.getByTestId('card'), 'focus')
    result.rerender(cloneElement(ui))

    // Only `focused` engages; `focusVisible` stays at progress 0 so its layer
    // doesn't contribute. Composed opacity is the focused target.
    const style = getStyle(result.toJSON() as never)
    expect(style.opacity).toBeCloseTo(0.7)
  })

  it('mounts onFocus when only focusVisible is declared (no focused)', () => {
    isFocusVisible.mockReturnValue(true)
    const ui = (
      <Motion.Pressable
        testID="card"
        initial={{ opacity: 1 }}
        animate={{ opacity: 1 }}
        gesture={{ focusVisible: { opacity: 0.5 } }}
        transition={{ type: 'timing', duration: 100 }}
      />
    )
    const result = renderWithMotion(ui)

    fireEvent(screen.getByTestId('card'), 'focus')
    result.rerender(cloneElement(ui))

    const style = getStyle(result.toJSON() as never)
    expect(style.opacity).toBeCloseTo(0.5)
  })

  it('pressed wins over focusVisible when both are active', () => {
    isFocusVisible.mockReturnValue(true)
    const ui = (
      <Motion.Pressable
        testID="card"
        initial={{ opacity: 1 }}
        animate={{ opacity: 1 }}
        gesture={{
          pressed: { opacity: 0.2 },
          focusVisible: { opacity: 0.5 },
        }}
        transition={{ type: 'timing', duration: 100 }}
      />
    )
    const result = renderWithMotion(ui)

    const node = screen.getByTestId('card')
    fireEvent(node, 'focus')
    fireEvent(node, 'pressIn')
    result.rerender(cloneElement(ui))

    // Pressed has highest priority; its target wins regardless of focus state.
    const style = getStyle(result.toJSON() as never)
    expect(style.opacity).toBeCloseTo(0.2)
  })
})

// Sanity check that the resolver wires the right values to the right SVs:
// the base SV gets `animate` targets, the per-layer progress SVs get 0/1.
describe('layered-blend resolver wiring', () => {
  it('drives layer progress through withTiming, not the base value SV', () => {
    const withTiming = jest.spyOn(Reanimated, 'withTiming')

    const ui = (
      <Motion.Pressable
        testID="card"
        initial={{ opacity: 1 }}
        animate={{ opacity: 1 }}
        gesture={{ pressed: { opacity: 0.3 } }}
        transition={{ type: 'timing', duration: 100 }}
      />
    )
    render(ui)

    withTiming.mockClear()
    fireEvent(screen.getByTestId('card'), 'pressIn')

    // Activation flip drives `progressPressed` → 1, never `opacity` → 0.3.
    // The 0.3 target stays JS-side and only materializes in the worklet's
    // lerp on each frame.
    const targets = withTiming.mock.calls.map((call) => call[0])
    expect(targets).toContain(1)
    expect(targets).not.toContain(0.3)
  })
})
