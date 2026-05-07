import { fireEvent, render, screen } from '@testing-library/react-native'
import * as Reanimated from 'react-native-reanimated'
import { Motion } from '../motion'

// Verify that `gesture.focusVisible` engages only when the input modality
// reads as keyboard, while `gesture.focused` engages on every focus.

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

// Each `withTiming(target, cfg, cb?)` call captures the target as its first
// arg. Asking "did the resolver compile a withTiming call to value V?" tells
// us which sub-state's target the merge resolved to on the last effect run.
function lastTargetFor(spy: jest.SpyInstance, target: number): boolean {
  return spy.mock.calls.some((call) => call[0] === target)
}

describe('gesture.focusVisible', () => {
  it('engages on focus when input modality reads as keyboard', () => {
    isFocusVisible.mockReturnValue(true)
    const withTiming = jest.spyOn(Reanimated, 'withTiming')

    render(
      <Motion.View
        testID="card"
        initial={{ opacity: 1 }}
        animate={{ opacity: 1 }}
        gesture={{
          focused: { opacity: 0.7 },
          focusVisible: { opacity: 0.4 },
        }}
        transition={{ type: 'timing', duration: 100 }}
      />,
    )

    withTiming.mockClear()
    fireEvent(screen.getByTestId('card'), 'focus')

    // Both focused and focusVisible engage; focusVisible is highest-priority
    // among focus sub-states, so the resolved opacity target is 0.4.
    expect(lastTargetFor(withTiming, 0.4)).toBe(true)
  })

  it('does not engage on focus when modality reads as pointer', () => {
    isFocusVisible.mockReturnValue(false)
    const withTiming = jest.spyOn(Reanimated, 'withTiming')

    render(
      <Motion.View
        testID="card"
        initial={{ opacity: 1 }}
        animate={{ opacity: 1 }}
        gesture={{
          focused: { opacity: 0.7 },
          focusVisible: { opacity: 0.4 },
        }}
        transition={{ type: 'timing', duration: 100 }}
      />,
    )

    withTiming.mockClear()
    fireEvent(screen.getByTestId('card'), 'focus')

    // focused engages (its target wins), focusVisible stays inert.
    expect(lastTargetFor(withTiming, 0.7)).toBe(true)
    expect(lastTargetFor(withTiming, 0.4)).toBe(false)
  })

  it('mounts onFocus when only focusVisible is declared (no focused)', () => {
    isFocusVisible.mockReturnValue(true)
    const withTiming = jest.spyOn(Reanimated, 'withTiming')

    render(
      <Motion.Pressable
        testID="card"
        initial={{ opacity: 1 }}
        animate={{ opacity: 1 }}
        gesture={{ focusVisible: { opacity: 0.5 } }}
        transition={{ type: 'timing', duration: 100 }}
      />,
    )

    withTiming.mockClear()
    fireEvent(screen.getByTestId('card'), 'focus')

    expect(lastTargetFor(withTiming, 0.5)).toBe(true)
  })

  it('pressed wins over focusVisible when both are active', () => {
    isFocusVisible.mockReturnValue(true)
    const withTiming = jest.spyOn(Reanimated, 'withTiming')

    render(
      <Motion.Pressable
        testID="card"
        initial={{ opacity: 1 }}
        animate={{ opacity: 1 }}
        gesture={{
          pressed: { opacity: 0.2 },
          focusVisible: { opacity: 0.5 },
        }}
        transition={{ type: 'timing', duration: 100 }}
      />,
    )

    const node = screen.getByTestId('card')
    fireEvent(node, 'focus')
    withTiming.mockClear()
    fireEvent(node, 'pressIn')

    // Pressed has highest priority; its target wins regardless of focus state.
    expect(lastTargetFor(withTiming, 0.2)).toBe(true)
  })
})
