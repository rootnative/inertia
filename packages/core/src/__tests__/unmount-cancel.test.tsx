import { render } from '@testing-library/react-native'
import * as Reanimated from 'react-native-reanimated'
import { Motion } from '../motion'
import {
  useAnimation,
  useBooleanSpring,
  useMotionValue,
  useSpring,
} from '../values'

// Part 3 of the value-layer interpolation proposal: value hooks and the
// Motion.* factory register an unmount cleanup that cancels their in-flight
// animations so an infinite-repeat (or still-settling) `withX` doesn't keep
// ticking its worklet against an orphaned shared value.
//
// The Reanimated mock's `cancelAnimation` is a no-op, so these tests spy on
// it and assert it fires on unmount against the hook-owned shared value(s).

type Probe<T = unknown> = { current?: T }

function HookProbe<T>({ use, probe }: { use: () => T; probe: Probe<T> }): null {
  probe.current = use()
  return null
}

beforeEach(() => {
  jest.restoreAllMocks()
})

describe('value hooks cancel in-flight animations on unmount', () => {
  it('useMotionValue cancels its shared value', () => {
    const cancel = jest.spyOn(Reanimated, 'cancelAnimation')
    const probe: Probe<{ value: number }> = {}
    const { unmount } = render(
      <HookProbe use={() => useMotionValue(0)} probe={probe} />,
    )
    const sv = probe.current
    expect(cancel).not.toHaveBeenCalled()
    unmount()
    expect(cancel).toHaveBeenCalledTimes(1)
    expect(cancel.mock.calls[0]![0]).toBe(sv)
  })

  it('useSpring cancels its output on unmount', () => {
    const cancel = jest.spyOn(Reanimated, 'cancelAnimation')
    const probe: Probe<{ value: number }> = {}
    const { unmount } = render(
      <HookProbe use={() => useSpring(100)} probe={probe} />,
    )
    const out = probe.current
    unmount()
    expect(cancel).toHaveBeenCalledWith(out)
  })

  it('useBooleanSpring (via useSpring) cancels its output on unmount', () => {
    const cancel = jest.spyOn(Reanimated, 'cancelAnimation')
    const probe: Probe<{ value: number }> = {}
    const { unmount } = render(
      <HookProbe use={() => useBooleanSpring(true)} probe={probe} />,
    )
    const out = probe.current
    unmount()
    expect(cancel).toHaveBeenCalledWith(out)
  })

  it('useAnimation cancels its output on unmount', () => {
    const cancel = jest.spyOn(Reanimated, 'cancelAnimation')
    const probe: Probe<{ value: number }> = {}
    const { unmount } = render(
      <HookProbe
        use={() =>
          useAnimation(1, {
            type: 'timing',
            duration: 500,
            repeat: 'infinite',
          })
        }
        probe={probe}
      />,
    )
    const out = probe.current
    unmount()
    expect(cancel).toHaveBeenCalledWith(out)
  })

  it('does not cancel while mounted across re-renders', () => {
    const cancel = jest.spyOn(Reanimated, 'cancelAnimation')
    const { rerender } = render(
      <HookProbe use={() => useMotionValue(0)} probe={{}} />,
    )
    rerender(<HookProbe use={() => useMotionValue(0)} probe={{}} />)
    rerender(<HookProbe use={() => useMotionValue(0)} probe={{}} />)
    expect(cancel).not.toHaveBeenCalled()
  })
})

describe('Motion.* factory cancels its animations on unmount', () => {
  it('cancels the per-key animatable shared values on unmount', () => {
    const cancel = jest.spyOn(Reanimated, 'cancelAnimation')
    const { unmount } = render(
      <Motion.View
        animate={{ opacity: 1, translateX: 100 }}
        transition={{ repeat: 'infinite' }}
      />,
    )
    expect(cancel).not.toHaveBeenCalled()
    unmount()
    // One cancel per animatable key plus the four gesture-layer progress SVs.
    // The exact count is an implementation detail; assert the guard fired for
    // the full per-key set (22 animatable keys) at minimum.
    expect(cancel.mock.calls.length).toBeGreaterThanOrEqual(22)
  })

  it('cancels the gesture-layer progress shared values on unmount', () => {
    const cancel = jest.spyOn(Reanimated, 'cancelAnimation')
    const { unmount } = render(
      <Motion.View gesture={{ pressed: { scale: 0.96 } }} />,
    )
    unmount()
    // 22 animatable keys + 4 gesture-layer progress SVs.
    expect(cancel.mock.calls.length).toBeGreaterThanOrEqual(26)
  })
})
