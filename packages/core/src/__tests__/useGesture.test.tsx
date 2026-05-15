import { renderHook } from '@testing-library/react-native'
import { type ReactNode } from 'react'
import * as Reanimated from 'react-native-reanimated'
import { useGesture } from '../values'
import { MotionConfig } from '../config'

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

describe('useGesture', () => {
  it('returns four shared values seeded to 0', () => {
    const { result } = renderHook(() => useGesture())
    expect(result.current.pressed.value).toBe(0)
    expect(result.current.focused.value).toBe(0)
    expect(result.current.focusVisible.value).toBe(0)
    expect(result.current.hovered.value).toBe(0)
  })

  it('onPressIn / onPressOut drive the pressed SV', () => {
    const { result } = renderHook(() => useGesture())
    result.current.handlers.onPressIn()
    expect(result.current.pressed.value).toBe(1)
    result.current.handlers.onPressOut()
    expect(result.current.pressed.value).toBe(0)
  })

  it('onHoverIn / onHoverOut drive the hovered SV', () => {
    const { result } = renderHook(() => useGesture())
    result.current.handlers.onHoverIn()
    expect(result.current.hovered.value).toBe(1)
    result.current.handlers.onHoverOut()
    expect(result.current.hovered.value).toBe(0)
  })

  it('onFocus raises focused and focusVisible when modality is keyboard', () => {
    isFocusVisible.mockReturnValue(true)
    const { result } = renderHook(() => useGesture())
    result.current.handlers.onFocus()
    expect(result.current.focused.value).toBe(1)
    expect(result.current.focusVisible.value).toBe(1)
  })

  it('onFocus raises only focused when modality is pointer', () => {
    isFocusVisible.mockReturnValue(false)
    const { result } = renderHook(() => useGesture())
    result.current.handlers.onFocus()
    expect(result.current.focused.value).toBe(1)
    expect(result.current.focusVisible.value).toBe(0)
  })

  it('onBlur lowers both focused and focusVisible', () => {
    isFocusVisible.mockReturnValue(true)
    const { result } = renderHook(() => useGesture())
    result.current.handlers.onFocus()
    result.current.handlers.onBlur()
    expect(result.current.focused.value).toBe(0)
    expect(result.current.focusVisible.value).toBe(0)
  })

  it('handler identity is stable across renders', () => {
    const { result, rerender } = renderHook(() => useGesture())
    const first = result.current.handlers
    rerender({})
    expect(result.current.handlers).toBe(first)
  })

  it('shared value identity is stable across renders', () => {
    const { result, rerender } = renderHook(() => useGesture())
    const { pressed, focused, focusVisible, hovered } = result.current
    rerender({})
    expect(result.current.pressed).toBe(pressed)
    expect(result.current.focused).toBe(focused)
    expect(result.current.focusVisible).toBe(focusVisible)
    expect(result.current.hovered).toBe(hovered)
  })

  it('respects MotionConfig reducedMotion="always" — no withSpring / withTiming', () => {
    const withSpring = jest.spyOn(Reanimated, 'withSpring')
    const withTiming = jest.spyOn(Reanimated, 'withTiming')

    const wrapper = ({ children }: { children: ReactNode }) => (
      <MotionConfig reducedMotion="always">{children}</MotionConfig>
    )
    const { result } = renderHook(
      () => useGesture({ type: 'timing', duration: 200 }),
      { wrapper },
    )

    withSpring.mockClear()
    withTiming.mockClear()
    result.current.handlers.onPressIn()

    expect(withSpring).not.toHaveBeenCalled()
    expect(withTiming).not.toHaveBeenCalled()
    expect(result.current.pressed.value).toBe(1)
  })

  it('top-level transition applies to every layer', () => {
    const withTiming = jest.spyOn(Reanimated, 'withTiming')
    const { result } = renderHook(() =>
      useGesture({ type: 'timing', duration: 150 }),
    )

    withTiming.mockClear()
    result.current.handlers.onHoverIn()
    expect(withTiming).toHaveBeenCalledTimes(1)
    expect(withTiming.mock.calls[0]![1]).toMatchObject({ duration: 150 })
  })

  it('per-layer transition overrides per layer', () => {
    const withTiming = jest.spyOn(Reanimated, 'withTiming')
    const { result } = renderHook(() =>
      useGesture({
        pressed: { type: 'timing', duration: 80 },
        hovered: { type: 'timing', duration: 200 },
      }),
    )

    withTiming.mockClear()
    result.current.handlers.onPressIn()
    result.current.handlers.onHoverIn()

    expect(withTiming).toHaveBeenCalledTimes(2)
    expect(withTiming.mock.calls[0]![1]).toMatchObject({ duration: 80 })
    expect(withTiming.mock.calls[1]![1]).toMatchObject({ duration: 200 })
  })

  it('falls back to the library default spring when no transition is given', () => {
    const withSpring = jest.spyOn(Reanimated, 'withSpring')
    const { result } = renderHook(() => useGesture())

    withSpring.mockClear()
    result.current.handlers.onPressIn()
    expect(withSpring).toHaveBeenCalledTimes(1)
  })
})
