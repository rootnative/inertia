import { renderHook } from '@testing-library/react-native'
import * as Reanimated from 'react-native-reanimated'
import { useDrag } from '../useDrag'

describe('useDrag', () => {
  it('returns the documented shape', () => {
    const { result } = renderHook(() => useDrag())
    expect(result.current.gesture).toBeDefined()
    expect(result.current.animatedStyle).toBeDefined()
    expect(result.current.dragX.value).toBe(0)
    expect(result.current.dragY.value).toBe(0)
    expect(result.current.isDragging.value).toBe(false)
  })

  it('updates dragX / dragY on pan update for an unconstrained two-axis drag', () => {
    const { result } = renderHook(() => useDrag())
    const handlers = (
      result.current.gesture as unknown as {
        config: Record<string, (e: unknown) => void>
      }
    ).config

    handlers.onActivate?.({})
    expect(result.current.isDragging.value).toBe(true)

    handlers.onUpdate?.({ translationX: 30, translationY: -15 })
    expect(result.current.dragX.value).toBe(30)
    expect(result.current.dragY.value).toBe(-15)

    handlers.onDeactivate?.({ velocityX: 0, velocityY: 0 })
    expect(result.current.isDragging.value).toBe(false)
  })

  it("ignores y motion when axis === 'x'", () => {
    const { result } = renderHook(() => useDrag({ axis: 'x' }))
    const handlers = (
      result.current.gesture as unknown as {
        config: Record<string, (e: unknown) => void>
      }
    ).config

    handlers.onActivate?.({})
    handlers.onUpdate?.({ translationX: 50, translationY: 200 })

    expect(result.current.dragX.value).toBe(50)
    expect(result.current.dragY.value).toBe(0)
  })

  it('hard-clamps to constraints when elastic is 0', () => {
    const { result } = renderHook(() =>
      useDrag({ constraints: { left: -20, right: 20 } }),
    )
    const handlers = (
      result.current.gesture as unknown as {
        config: Record<string, (e: unknown) => void>
      }
    ).config

    handlers.onActivate?.({})
    handlers.onUpdate?.({ translationX: 100, translationY: 0 })
    expect(result.current.dragX.value).toBe(20)

    handlers.onUpdate?.({ translationX: -100, translationY: 0 })
    expect(result.current.dragX.value).toBe(-20)
  })

  it('rubber-bands overshoot when elastic > 0', () => {
    const { result } = renderHook(() =>
      useDrag({ constraints: { right: 100 }, elastic: 0.5 }),
    )
    const handlers = (
      result.current.gesture as unknown as {
        config: Record<string, (e: unknown) => void>
      }
    ).config

    handlers.onActivate?.({})
    handlers.onUpdate?.({ translationX: 200, translationY: 0 })
    // Overshoot of 100 past the right bound, scaled by 0.5 → 100 + 50 = 150.
    expect(result.current.dragX.value).toBe(150)
  })

  it('fires onDragEnd with the final translation and release velocity', () => {
    const onDragEnd = jest.fn()
    const { result } = renderHook(() => useDrag({ onDragEnd }))
    const handlers = (
      result.current.gesture as unknown as {
        config: Record<string, (e: unknown) => void>
      }
    ).config

    handlers.onActivate?.({})
    handlers.onUpdate?.({ translationX: 12, translationY: 34 })
    handlers.onDeactivate?.({ velocityX: 800, velocityY: -200 })

    expect(onDragEnd).toHaveBeenCalledWith({
      x: 12,
      y: 34,
      velocity: { x: 800, y: -200 },
    })
  })

  it('fires onRelease on the UI thread with the same payload as onDragEnd', () => {
    const onRelease = jest.fn()
    const { result } = renderHook(() => useDrag({ onRelease }))
    const handlers = (
      result.current.gesture as unknown as {
        config: Record<string, (e: unknown) => void>
      }
    ).config

    handlers.onActivate?.({})
    handlers.onUpdate?.({ translationX: 70, translationY: -10 })
    handlers.onDeactivate?.({ velocityX: 1500, velocityY: 200 })

    expect(onRelease).toHaveBeenCalledWith({
      x: 70,
      y: -10,
      velocity: { x: 1500, y: 200 },
    })
  })

  it('composes onRelease with onDragEnd — both fire on release', () => {
    const onRelease = jest.fn()
    const onDragEnd = jest.fn()
    const { result } = renderHook(() => useDrag({ onRelease, onDragEnd }))
    const handlers = (
      result.current.gesture as unknown as {
        config: Record<string, (e: unknown) => void>
      }
    ).config

    handlers.onActivate?.({})
    handlers.onDeactivate?.({ velocityX: 100, velocityY: 100 })

    expect(onRelease).toHaveBeenCalledTimes(1)
    expect(onDragEnd).toHaveBeenCalledTimes(1)
  })

  it('skips onRelease axes that the axis lock excludes', () => {
    // axis: 'x' — only the x SV should pick up the release transition; the y
    // entry in the returned ReleaseResult is ignored.
    const onRelease = jest.fn(() => ({
      x: { type: 'spring' as const, to: 200 },
      y: { type: 'spring' as const, to: 999 },
    }))
    const { result } = renderHook(() => useDrag({ axis: 'x', onRelease }))
    const handlers = (
      result.current.gesture as unknown as {
        config: Record<string, (e: unknown) => void>
      }
    ).config

    handlers.onActivate?.({})
    handlers.onUpdate?.({ translationX: 50, translationY: 0 })
    handlers.onDeactivate?.({ velocityX: 0, velocityY: 0 })

    expect(onRelease).toHaveBeenCalled()
    // y SV stays untouched (locked out by axis: 'x').
    expect(result.current.dragY.value).toBe(0)
  })

  it('leaves SVs alone when onRelease returns void / undefined', () => {
    // Consumer wants gesture velocity for analytics but no SV animation.
    const onRelease = jest.fn(() => undefined)
    const { result } = renderHook(() => useDrag({ onRelease }))
    const handlers = (
      result.current.gesture as unknown as {
        config: Record<string, (e: unknown) => void>
      }
    ).config

    handlers.onActivate?.({})
    handlers.onUpdate?.({ translationX: 25, translationY: 25 })
    handlers.onDeactivate?.({ velocityX: 0, velocityY: 0 })

    // SVs sit at the release position — no withSpring/withDecay assignment.
    expect(result.current.dragX.value).toBe(25)
    expect(result.current.dragY.value).toBe(25)
  })

  it('fires onDragStart when the pan starts', () => {
    const onDragStart = jest.fn()
    const { result } = renderHook(() => useDrag({ onDragStart }))
    const handlers = (
      result.current.gesture as unknown as {
        config: Record<string, (e: unknown) => void>
      }
    ).config
    handlers.onActivate?.({})
    expect(onDragStart).toHaveBeenCalledTimes(1)
    expect(result.current.isDragging.value).toBe(true)
  })

  it('routes a decay release through withDecay with no target', () => {
    const withDecay = jest.spyOn(Reanimated, 'withDecay')
    const onRelease = jest.fn(() => ({
      x: { type: 'decay' as const, velocity: 900 },
    }))
    const { result } = renderHook(() => useDrag({ onRelease }))
    const handlers = (
      result.current.gesture as unknown as {
        config: Record<string, (e: unknown) => void>
      }
    ).config
    handlers.onActivate?.({})
    handlers.onUpdate?.({ translationX: 40, translationY: 10 })
    handlers.onDeactivate?.({ velocityX: 900, velocityY: 0 })
    expect(withDecay).toHaveBeenCalledTimes(1)
    expect(withDecay.mock.calls[0]![0]).toEqual(
      expect.objectContaining({ velocity: 900 }),
    )
    // The y axis was not in the result, so it stays where it landed.
    expect(result.current.dragY.value).toBe(10)
  })

  it('keeps the gesture identity when inline callbacks change, and calls the latest', () => {
    const first = jest.fn()
    const { result, rerender } = renderHook(
      (props: { onDragEnd: () => void }) => useDrag(props),
      { initialProps: { onDragEnd: first } },
    )
    const gesture = result.current.gesture
    const latest = jest.fn()
    rerender({ onDragEnd: latest })
    expect(result.current.gesture).toBe(gesture)

    const handlers = (
      gesture as unknown as { config: Record<string, (e: unknown) => void> }
    ).config
    handlers.onActivate?.({})
    handlers.onDeactivate?.({ velocityX: 0, velocityY: 0 })
    expect(first).not.toHaveBeenCalled()
    expect(latest).toHaveBeenCalledTimes(1)
  })
})

describe('useDrag — elastic snap-back', () => {
  beforeEach(() => {
    jest.restoreAllMocks()
  })

  function getHandlers(gesture: unknown) {
    return (gesture as { config: Record<string, (e: unknown) => void> }).config
  }

  it('springs an overshoot back to the bound with the release velocity', () => {
    const withSpring = jest.spyOn(Reanimated, 'withSpring')
    const { result } = renderHook(() =>
      useDrag({
        axis: 'x',
        constraints: { left: -100, right: 100 },
        elastic: 0.5,
      }),
    )
    const handlers = getHandlers(result.current.gesture)

    handlers.onActivate?.({})
    handlers.onUpdate?.({ translationX: 200, translationY: 0 })
    expect(result.current.dragX.value).toBe(150)
    handlers.onDeactivate?.({ velocityX: 700, velocityY: 0 })

    expect(withSpring).toHaveBeenCalledTimes(1)
    expect(withSpring.mock.calls[0]![0]).toBe(100)
    expect(withSpring.mock.calls[0]![1]).toEqual(
      expect.objectContaining({ velocity: 700 }),
    )
    expect(result.current.dragX.value).toBe(100)
  })

  it('springs both axes back to their lower bounds', () => {
    const { result } = renderHook(() =>
      useDrag({ constraints: { left: -100, top: -60 }, elastic: 0.5 }),
    )
    const handlers = getHandlers(result.current.gesture)

    handlers.onActivate?.({})
    handlers.onUpdate?.({ translationX: -200, translationY: -200 })
    expect(result.current.dragX.value).toBe(-150)
    expect(result.current.dragY.value).toBe(-130)
    handlers.onDeactivate?.({ velocityX: 0, velocityY: 0 })

    expect(result.current.dragX.value).toBe(-100)
    expect(result.current.dragY.value).toBe(-60)
  })

  it('leaves a release inside the constraints where it landed', () => {
    const withSpring = jest.spyOn(Reanimated, 'withSpring')
    const { result } = renderHook(() =>
      useDrag({ constraints: { left: -100, right: 100 }, elastic: 0.4 }),
    )
    const handlers = getHandlers(result.current.gesture)

    handlers.onActivate?.({})
    handlers.onUpdate?.({ translationX: 50, translationY: 0 })
    handlers.onDeactivate?.({ velocityX: 300, velocityY: 0 })

    expect(withSpring).not.toHaveBeenCalled()
    expect(result.current.dragX.value).toBe(50)
  })

  it('springs back only the axes that onRelease leaves out', () => {
    const withSpring = jest.spyOn(Reanimated, 'withSpring')
    const onRelease = jest.fn(() => ({
      y: { type: 'no-animation' as const, to: 10 },
    }))
    const { result } = renderHook(() =>
      useDrag({
        constraints: { right: 100, bottom: 50 },
        elastic: 0.5,
        onRelease,
      }),
    )
    const handlers = getHandlers(result.current.gesture)

    handlers.onActivate?.({})
    handlers.onUpdate?.({ translationX: 200, translationY: 200 })
    handlers.onDeactivate?.({ velocityX: 0, velocityY: 0 })

    // y takes the transition from onRelease, past its bound or not.
    expect(result.current.dragY.value).toBe(10)
    expect(withSpring).toHaveBeenCalledTimes(1)
    expect(result.current.dragX.value).toBe(100)
  })
})
