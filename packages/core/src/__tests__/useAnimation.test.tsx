import { renderHook } from '@testing-library/react-native'
import { type ReactNode } from 'react'
import * as Reanimated from 'react-native-reanimated'
import { MotionConfig } from '../config'
import { useAnimation } from '../values'

describe('useAnimation', () => {
  beforeEach(() => {
    jest.restoreAllMocks()
  })

  it('seeds the shared value with the initial target', () => {
    const { result } = renderHook(() => useAnimation(0.5))
    expect(result.current.value).toBe(0.5)
  })

  it('writes the target through withSpring by default', () => {
    const withSpring = jest.spyOn(Reanimated, 'withSpring')
    renderHook(() => useAnimation(1))
    expect(withSpring).toHaveBeenCalledTimes(1)
    expect(withSpring.mock.calls[0]![0]).toBe(1)
  })

  it('honours an explicit timing transition', () => {
    const withTiming = jest.spyOn(Reanimated, 'withTiming')
    const withSpring = jest.spyOn(Reanimated, 'withSpring')
    renderHook(() => useAnimation(1, { type: 'timing', duration: 200 }))
    expect(withTiming).toHaveBeenCalledTimes(1)
    expect(withTiming.mock.calls[0]![0]).toBe(1)
    expect(withTiming.mock.calls[0]![1]).toMatchObject({ duration: 200 })
    expect(withSpring).not.toHaveBeenCalled()
  })

  it('re-runs the animation when target changes', () => {
    const withTiming = jest.spyOn(Reanimated, 'withTiming')
    const { rerender } = renderHook(
      ({ value }) => useAnimation(value, { type: 'timing', duration: 100 }),
      { initialProps: { value: 0 } },
    )
    withTiming.mockClear()
    rerender({ value: 1 })
    expect(withTiming).toHaveBeenCalledTimes(1)
    expect(withTiming.mock.calls[0]![0]).toBe(1)
  })

  it('does not re-run when only the transition object identity changes', () => {
    const withTiming = jest.spyOn(Reanimated, 'withTiming')
    const { rerender } = renderHook(
      // Fresh literal each render; structural sig is identical.
      ({ value }) => useAnimation(value, { type: 'timing', duration: 100 }),
      { initialProps: { value: 0.5 } },
    )
    withTiming.mockClear()
    rerender({ value: 0.5 })
    expect(withTiming).not.toHaveBeenCalled()
  })

  it('wraps the animation in withRepeat when repeat is configured', () => {
    const withRepeat = jest.spyOn(Reanimated, 'withRepeat')
    renderHook(() =>
      useAnimation(1, {
        type: 'timing',
        duration: 1800,
        repeat: { count: 'infinite', alternate: false },
      }),
    )
    expect(withRepeat).toHaveBeenCalledTimes(1)
    expect(withRepeat.mock.calls[0]![1]).toBe(-1)
    expect(withRepeat.mock.calls[0]![2]).toBe(false)
  })

  it('snaps without calling withSpring / withTiming when reducedMotion="always"', () => {
    const withSpring = jest.spyOn(Reanimated, 'withSpring')
    const withTiming = jest.spyOn(Reanimated, 'withTiming')
    const wrapper = ({ children }: { children: ReactNode }) => (
      <MotionConfig reducedMotion="always">{children}</MotionConfig>
    )
    const { result } = renderHook(
      () => useAnimation(1, { type: 'timing', duration: 200 }),
      { wrapper },
    )
    expect(withTiming).not.toHaveBeenCalled()
    expect(withSpring).not.toHaveBeenCalled()
    expect(result.current.value).toBe(1)
  })

  it('returns an identity-stable shared value across renders', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useAnimation(value),
      { initialProps: { value: 0 } },
    )
    const first = result.current
    rerender({ value: 1 })
    expect(result.current).toBe(first)
  })
})
