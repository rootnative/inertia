import { renderHook } from '@testing-library/react-native'
import * as Reanimated from 'react-native-reanimated'
import { usePan } from '../usePan'

type Handlers = Record<string, (e: unknown) => void>

function getHandlers(gesture: unknown): Handlers {
  return (gesture as { handlers: Handlers }).handlers
}

describe('usePan', () => {
  beforeEach(() => {
    jest.restoreAllMocks()
  })

  it('returns the documented shape', () => {
    const { result } = renderHook(() => usePan())
    expect(result.current.gesture).toBeDefined()
    expect(result.current.animatedStyle).toBeDefined()
    expect(result.current.panX.value).toBe(0)
    expect(result.current.panY.value).toBe(0)
    expect(result.current.isPanning.value).toBe(false)
  })

  it('continues from the previous position across separate pans', () => {
    const { result } = renderHook(() => usePan({ disableMomentum: true }))
    const h = getHandlers(result.current.gesture)

    h.onStart?.({})
    h.onUpdate?.({ translationX: 50, translationY: 30 })
    h.onEnd?.({ velocityX: 0, velocityY: 0 })
    expect(result.current.panX.value).toBe(50)
    expect(result.current.panY.value).toBe(30)

    h.onStart?.({})
    h.onUpdate?.({ translationX: -10, translationY: 5 })
    expect(result.current.panX.value).toBe(40)
    expect(result.current.panY.value).toBe(35)
  })

  it('hard-clamps to constraints during the active gesture', () => {
    const { result } = renderHook(() =>
      usePan({
        disableMomentum: true,
        constraints: { left: -50, right: 50, top: -50, bottom: 50 },
      }),
    )
    const h = getHandlers(result.current.gesture)

    h.onStart?.({})
    h.onUpdate?.({ translationX: 200, translationY: -200 })
    expect(result.current.panX.value).toBe(50)
    expect(result.current.panY.value).toBe(-50)
  })

  it("toggles isPanning across the gesture's lifecycle", () => {
    const { result } = renderHook(() => usePan({ disableMomentum: true }))
    const h = getHandlers(result.current.gesture)

    h.onStart?.({})
    expect(result.current.isPanning.value).toBe(true)

    h.onEnd?.({ velocityX: 0, velocityY: 0 })
    expect(result.current.isPanning.value).toBe(false)
  })

  it('momentum path runs without throwing', () => {
    // The Reanimated mock returns the decay config as the assigned value, so
    // we can't assert the post-decay numeric state — we only verify the
    // worklet body executes cleanly with momentum enabled.
    const { result } = renderHook(() =>
      usePan({ deceleration: 0.995, constraints: { left: -100, right: 100 } }),
    )
    const h = getHandlers(result.current.gesture)
    expect(() => {
      h.onStart?.({})
      h.onUpdate?.({ translationX: 80, translationY: 0 })
      h.onEnd?.({ velocityX: 1200, velocityY: 0 })
    }).not.toThrow()
  })

  it('forwards velocity, deceleration, and clamp into withDecay on release', () => {
    const withDecay = jest.spyOn(Reanimated, 'withDecay')
    const { result } = renderHook(() =>
      usePan({ deceleration: 0.995, constraints: { left: -100, right: 100 } }),
    )
    const h = getHandlers(result.current.gesture)
    h.onStart?.({})
    h.onUpdate?.({ translationX: 80, translationY: 0 })
    h.onEnd?.({ velocityX: 1200, velocityY: -300 })
    expect(withDecay).toHaveBeenCalledTimes(2)
    expect(withDecay.mock.calls[0]![0]).toEqual({
      velocity: 1200,
      deceleration: 0.995,
      clamp: [-100, 100],
    })
    // The y axis has no bounds, so no `clamp` key is sent.
    expect(withDecay.mock.calls[1]![0]).toEqual({
      velocity: -300,
      deceleration: 0.995,
    })
  })

  it('widens a one-sided constraint to an infinite far edge for withDecay', () => {
    const withDecay = jest.spyOn(Reanimated, 'withDecay')
    const { result } = renderHook(() => usePan({ constraints: { top: 0 } }))
    const h = getHandlers(result.current.gesture)
    h.onStart?.({})
    h.onEnd?.({ velocityX: 0, velocityY: 500 })
    expect(withDecay.mock.calls[1]![0]).toEqual({
      velocity: 500,
      clamp: [0, Number.POSITIVE_INFINITY],
    })
  })

  it('disableMomentum skips withDecay on release', () => {
    const withDecay = jest.spyOn(Reanimated, 'withDecay')
    const { result } = renderHook(() => usePan({ disableMomentum: true }))
    const h = getHandlers(result.current.gesture)
    h.onStart?.({})
    h.onEnd?.({ velocityX: 1200, velocityY: 0 })
    expect(withDecay).not.toHaveBeenCalled()
    expect(result.current.isPanning.value).toBe(false)
  })
})
