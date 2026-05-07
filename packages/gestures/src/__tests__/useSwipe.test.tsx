import { renderHook } from '@testing-library/react-native'
import { useSwipe } from '../useSwipe'

type Handlers = Record<string, (e: unknown) => void>

function getHandlers(gesture: unknown): Handlers {
  return (gesture as { handlers: Handlers }).handlers
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
    h.onEnd?.({ translationX: -90, translationY: 0, velocityX: 0, velocityY: 0 })

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
    h.onEnd?.({ translationX: 20, translationY: 0, velocityX: 100, velocityY: 0 })

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
