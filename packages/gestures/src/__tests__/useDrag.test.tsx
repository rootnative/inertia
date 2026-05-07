import { renderHook } from '@testing-library/react-native'
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
        handlers: Record<string, (e: unknown) => void>
      }
    ).handlers

    handlers.onStart?.({})
    expect(result.current.isDragging.value).toBe(true)

    handlers.onUpdate?.({ translationX: 30, translationY: -15 })
    expect(result.current.dragX.value).toBe(30)
    expect(result.current.dragY.value).toBe(-15)

    handlers.onEnd?.({ velocityX: 0, velocityY: 0 })
    expect(result.current.isDragging.value).toBe(false)
  })

  it("ignores y motion when axis === 'x'", () => {
    const { result } = renderHook(() => useDrag({ axis: 'x' }))
    const handlers = (
      result.current.gesture as unknown as {
        handlers: Record<string, (e: unknown) => void>
      }
    ).handlers

    handlers.onStart?.({})
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
        handlers: Record<string, (e: unknown) => void>
      }
    ).handlers

    handlers.onStart?.({})
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
        handlers: Record<string, (e: unknown) => void>
      }
    ).handlers

    handlers.onStart?.({})
    handlers.onUpdate?.({ translationX: 200, translationY: 0 })
    // Overshoot of 100 past the right bound, scaled by 0.5 → 100 + 50 = 150.
    expect(result.current.dragX.value).toBe(150)
  })

  it('fires onDragEnd with the final translation and release velocity', () => {
    const onDragEnd = jest.fn()
    const { result } = renderHook(() => useDrag({ onDragEnd }))
    const handlers = (
      result.current.gesture as unknown as {
        handlers: Record<string, (e: unknown) => void>
      }
    ).handlers

    handlers.onStart?.({})
    handlers.onUpdate?.({ translationX: 12, translationY: 34 })
    handlers.onEnd?.({ velocityX: 800, velocityY: -200 })

    expect(onDragEnd).toHaveBeenCalledWith({
      x: 12,
      y: 34,
      velocity: { x: 800, y: -200 },
    })
  })
})
