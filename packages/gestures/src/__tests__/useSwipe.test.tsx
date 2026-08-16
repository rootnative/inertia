import type { ReactNode } from 'react'
import { renderHook } from '@testing-library/react-native'
import * as Reanimated from 'react-native-reanimated'
import { MotionConfig } from '@rootnative/inertia'
import { useSwipe } from '../useSwipe'

type Handlers = Record<string, (e: unknown) => void>

function getHandlers(gesture: unknown): Handlers {
  return (gesture as { handlers: Handlers }).handlers
}

// A release event that commits a right swipe (distance past the default 80).
const COMMIT_RIGHT = {
  translationX: 200,
  translationY: 10,
  velocityX: 300,
  velocityY: 0,
}

// A release event below both default thresholds — snaps back, no commit.
const NO_COMMIT = {
  translationX: 20,
  translationY: 0,
  velocityX: 500,
  velocityY: -40,
}

describe('useSwipe', () => {
  it('returns the documented shape', () => {
    const { result } = renderHook(() => useSwipe())
    expect(result.current.gesture).toBeDefined()
    expect(result.current.animatedStyle).toBeDefined()
    expect(result.current.swipeX.value).toBe(0)
    expect(result.current.swipeY.value).toBe(0)
    expect(result.current.isActive.value).toBe(false)
  })

  it('fires onSwipe when the distance threshold is met', () => {
    const onSwipe = jest.fn()
    const { result } = renderHook(() => useSwipe({ onSwipe }))
    const h = getHandlers(result.current.gesture)

    h.onStart?.({})
    h.onUpdate?.({ translationX: -90, translationY: 0 })
    h.onEnd?.({
      translationX: -90,
      translationY: 0,
      velocityX: 0,
      velocityY: 0,
    })

    expect(onSwipe).toHaveBeenCalledWith('left', { distance: 90, velocity: 0 })
  })

  it('fires onSwipe when only the velocity threshold is met (flick)', () => {
    const onSwipe = jest.fn()
    const { result } = renderHook(() =>
      useSwipe({ onSwipe, distanceThreshold: 200 }),
    )
    const h = getHandlers(result.current.gesture)

    h.onStart?.({})
    h.onUpdate?.({ translationX: 30, translationY: 0 })
    h.onEnd?.({
      translationX: 30,
      translationY: 0,
      velocityX: 1500,
      velocityY: 0,
    })

    expect(onSwipe).toHaveBeenCalledWith('right', {
      distance: 30,
      velocity: 1500,
    })
  })

  it('does not fire when neither threshold is met', () => {
    const onSwipe = jest.fn()
    const { result } = renderHook(() => useSwipe({ onSwipe }))
    const h = getHandlers(result.current.gesture)

    h.onStart?.({})
    h.onEnd?.({
      translationX: 20,
      translationY: 0,
      velocityX: 100,
      velocityY: 0,
    })

    expect(onSwipe).not.toHaveBeenCalled()
  })

  it('respects allowed directions', () => {
    const onSwipe = jest.fn()
    const { result } = renderHook(() =>
      useSwipe({ onSwipe, directions: ['left'] }),
    )
    const h = getHandlers(result.current.gesture)

    h.onStart?.({})
    h.onEnd?.({
      translationX: 200,
      translationY: 0,
      velocityX: 2000,
      velocityY: 0,
    })

    expect(onSwipe).not.toHaveBeenCalled()
  })

  it('picks the dominant axis when both have motion', () => {
    const onSwipe = jest.fn()
    const { result } = renderHook(() => useSwipe({ onSwipe }))
    const h = getHandlers(result.current.gesture)

    h.onStart?.({})
    h.onEnd?.({
      translationX: 30,
      translationY: 120,
      velocityX: 100,
      velocityY: 200,
    })

    expect(onSwipe).toHaveBeenCalledWith('down', expect.any(Object))
  })

  it('updates live translation while dragging', () => {
    const { result } = renderHook(() => useSwipe())
    const h = getHandlers(result.current.gesture)

    h.onStart?.({})
    h.onUpdate?.({ translationX: 42, translationY: -7 })

    expect(result.current.swipeX.value).toBe(42)
    expect(result.current.swipeY.value).toBe(-7)
  })
})

describe('useSwipe — releaseTransition', () => {
  beforeEach(() => {
    jest.restoreAllMocks()
  })

  it('snaps back with the default spring and the release velocity', () => {
    const withSpring = jest.spyOn(Reanimated, 'withSpring')
    const { result } = renderHook(() => useSwipe())
    const h = getHandlers(result.current.gesture)

    h.onStart?.({})
    h.onEnd?.(NO_COMMIT)

    expect(withSpring).toHaveBeenCalledTimes(2)
    // x axis carries velocityX, y axis carries velocityY.
    expect(withSpring.mock.calls[0]![0]).toBe(0)
    expect(withSpring.mock.calls[0]![1]).toEqual(
      expect.objectContaining({ velocity: 500 }),
    )
    expect(withSpring.mock.calls[1]![1]).toEqual(
      expect.objectContaining({ velocity: -40 }),
    )
  })

  it('uses an inline timing config for the snap-back', () => {
    const withTiming = jest.spyOn(Reanimated, 'withTiming')
    const withSpring = jest.spyOn(Reanimated, 'withSpring')
    const { result } = renderHook(() =>
      useSwipe({ releaseTransition: { type: 'timing', duration: 120 } }),
    )
    const h = getHandlers(result.current.gesture)

    h.onStart?.({})
    h.onEnd?.(NO_COMMIT)

    expect(withSpring).not.toHaveBeenCalled()
    expect(withTiming).toHaveBeenCalledTimes(2)
    expect(withTiming.mock.calls[0]![0]).toBe(0)
    expect(withTiming.mock.calls[0]![1]).toEqual(
      expect.objectContaining({ duration: 120 }),
    )
  })

  it('does not overwrite an explicit velocity on a spring config', () => {
    const withSpring = jest.spyOn(Reanimated, 'withSpring')
    const { result } = renderHook(() =>
      useSwipe({ releaseTransition: { type: 'spring', velocity: 7 } }),
    )
    const h = getHandlers(result.current.gesture)

    h.onStart?.({})
    h.onEnd?.(NO_COMMIT)

    expect(withSpring.mock.calls[0]![1]).toEqual(
      expect.objectContaining({ velocity: 7 }),
    )
  })

  it('resolves a registered transition name from MotionConfig', () => {
    const withTiming = jest.spyOn(Reanimated, 'withTiming')
    const wrapper = ({ children }: { children: ReactNode }) => (
      <MotionConfig transitions={{ snap: { type: 'timing', duration: 90 } }}>
        {children}
      </MotionConfig>
    )
    const { result } = renderHook(
      () => useSwipe({ releaseTransition: 'snap' }),
      { wrapper },
    )
    const h = getHandlers(result.current.gesture)

    h.onStart?.({})
    h.onEnd?.(NO_COMMIT)

    expect(withTiming).toHaveBeenCalledTimes(2)
    expect(withTiming.mock.calls[0]![1]).toEqual(
      expect.objectContaining({ duration: 90 }),
    )
  })

  it('falls back to the default spring when a name resolves to decay', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})
    const withSpring = jest.spyOn(Reanimated, 'withSpring')
    const withDecay = jest.spyOn(Reanimated, 'withDecay')
    const wrapper = ({ children }: { children: ReactNode }) => (
      <MotionConfig transitions={{ fling: { type: 'decay' } }}>
        {children}
      </MotionConfig>
    )
    const { result } = renderHook(
      () => useSwipe({ releaseTransition: 'fling' }),
      { wrapper },
    )
    const h = getHandlers(result.current.gesture)

    h.onStart?.({})
    h.onEnd?.(NO_COMMIT)

    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('releaseTransition'),
    )
    expect(withDecay).not.toHaveBeenCalled()
    expect(withSpring).toHaveBeenCalledTimes(2)
  })
})

describe('useSwipe — commit exit (onCommit / onSwipeEnd)', () => {
  beforeEach(() => {
    jest.restoreAllMocks()
  })

  it('runs the returned exit transition instead of the snap-back', () => {
    const onCommit = jest.fn(() => ({
      x: { type: 'timing', to: 480, duration: 200 } as const,
    }))
    const { result } = renderHook(() => useSwipe({ onCommit }))
    const h = getHandlers(result.current.gesture)

    h.onStart?.({})
    h.onUpdate?.({ translationX: 200, translationY: 10 })
    h.onEnd?.(COMMIT_RIGHT)

    expect(onCommit).toHaveBeenCalledWith('right', {
      x: 200,
      y: 10,
      velocity: { x: 300, y: 0 },
    })
    // The mock resolves animations synchronously: x lands at the exit
    // target, the omitted y axis snaps back to zero.
    expect(result.current.swipeX.value).toBe(480)
    expect(result.current.swipeY.value).toBe(0)
  })

  it('does not call onCommit when the release does not commit', () => {
    const onCommit = jest.fn()
    const { result } = renderHook(() => useSwipe({ onCommit }))
    const h = getHandlers(result.current.gesture)

    h.onStart?.({})
    h.onEnd?.(NO_COMMIT)

    expect(onCommit).not.toHaveBeenCalled()
  })

  it('snaps back as usual when onCommit returns nothing', () => {
    const withSpring = jest.spyOn(Reanimated, 'withSpring')
    const onCommit = jest.fn(() => undefined)
    const { result } = renderHook(() => useSwipe({ onCommit }))
    const h = getHandlers(result.current.gesture)

    h.onStart?.({})
    h.onEnd?.(COMMIT_RIGHT)

    expect(onCommit).toHaveBeenCalled()
    expect(withSpring).toHaveBeenCalledTimes(2)
    expect(result.current.swipeX.value).toBe(0)
    expect(result.current.swipeY.value).toBe(0)
  })

  it('fires onSwipeEnd when the commit exit settles', () => {
    const withTiming = jest.spyOn(Reanimated, 'withTiming')
    const onSwipeEnd = jest.fn()
    const { result } = renderHook(() =>
      useSwipe({
        onCommit: () => ({
          x: { type: 'timing', to: 480 } as const,
        }),
        onSwipeEnd,
      }),
    )
    const h = getHandlers(result.current.gesture)

    h.onStart?.({})
    h.onEnd?.(COMMIT_RIGHT)

    // The settle callback rides the swipe axis (x for a right swipe).
    expect(onSwipeEnd).not.toHaveBeenCalled()
    const settle = withTiming.mock.calls[0]![2] as (f?: boolean) => void
    settle(true)
    expect(onSwipeEnd).toHaveBeenCalledTimes(1)
    expect(onSwipeEnd).toHaveBeenCalledWith('right', { finished: true })
  })

  it('fires onSwipeEnd when the default snap-back settles after a commit', () => {
    const withSpring = jest.spyOn(Reanimated, 'withSpring')
    const onSwipeEnd = jest.fn()
    const { result } = renderHook(() => useSwipe({ onSwipeEnd }))
    const h = getHandlers(result.current.gesture)

    h.onStart?.({})
    h.onEnd?.(COMMIT_RIGHT)

    const settle = withSpring.mock.calls[0]![2] as (f?: boolean) => void
    settle(false)
    expect(onSwipeEnd).toHaveBeenCalledWith('right', { finished: false })
  })

  it('does not fire onSwipeEnd for a release that did not commit', () => {
    const withSpring = jest.spyOn(Reanimated, 'withSpring')
    const onSwipeEnd = jest.fn()
    const { result } = renderHook(() => useSwipe({ onSwipeEnd }))
    const h = getHandlers(result.current.gesture)

    h.onStart?.({})
    h.onEnd?.(NO_COMMIT)

    // No settle callback is attached on a non-commit release.
    expect(withSpring.mock.calls[0]![2]).toBeUndefined()
    expect(withSpring.mock.calls[1]![2]).toBeUndefined()
    expect(onSwipeEnd).not.toHaveBeenCalled()
  })

  it('reset() zeroes both shared values', () => {
    const { result } = renderHook(() =>
      useSwipe({
        onCommit: () => ({ x: { type: 'no-animation', to: 480 } as const }),
      }),
    )
    const h = getHandlers(result.current.gesture)

    h.onStart?.({})
    h.onEnd?.(COMMIT_RIGHT)
    expect(result.current.swipeX.value).toBe(480)

    result.current.reset()
    expect(result.current.swipeX.value).toBe(0)
    expect(result.current.swipeY.value).toBe(0)
  })
})
