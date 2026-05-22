import { renderHook } from '@testing-library/react-native'
import { PanResponder } from 'react-native'
import { useTouchDrag } from '../useTouchDrag'

// Capture the responder config that `useTouchDrag` passes to
// `PanResponder.create` and replay its callbacks with synthetic gesture
// states. The real PanResponder wraps callbacks behind its own state machine,
// so driving the config directly keeps tests focused on hook semantics
// instead of RN's gesture lifecycle internals.

type ResponderConfig = {
  onPanResponderGrant?: (e: unknown, g: unknown) => void
  onPanResponderMove?: (e: unknown, g: unknown) => void
  onPanResponderRelease?: (e: unknown, g: unknown) => void
  onPanResponderTerminate?: (e: unknown, g: unknown) => void
}

function captureConfig(): {
  spy: jest.SpyInstance
  config: () => ResponderConfig
} {
  const spy = jest.spyOn(PanResponder, 'create')
  return {
    spy,
    config: () => spy.mock.calls[0]![0] as ResponderConfig,
  }
}

function gesture(dx = 0, dy = 0, vx = 0, vy = 0) {
  return {
    dx,
    dy,
    vx,
    vy,
    x0: 0,
    y0: 0,
    moveX: 0,
    moveY: 0,
    numberActiveTouches: 1,
    stateID: 0,
  }
}

describe('useTouchDrag', () => {
  beforeEach(() => {
    jest.restoreAllMocks()
  })

  it('returns the documented shape', () => {
    const { result } = renderHook(() => useTouchDrag())
    expect(result.current.panHandlers).toBeDefined()
    expect(result.current.animatedStyle).toBeDefined()
    expect(result.current.dragX.value).toBe(0)
    expect(result.current.dragY.value).toBe(0)
    expect(result.current.isDragging.value).toBe(false)
  })

  it('updates dragX / dragY on move for an unconstrained two-axis drag', () => {
    const { spy, config } = captureConfig()
    const { result } = renderHook(() => useTouchDrag())
    const cfg = config()

    cfg.onPanResponderGrant?.({}, gesture())
    expect(result.current.isDragging.value).toBe(true)

    cfg.onPanResponderMove?.({}, gesture(30, -15))
    expect(result.current.dragX.value).toBe(30)
    expect(result.current.dragY.value).toBe(-15)

    cfg.onPanResponderRelease?.({}, gesture(30, -15, 0, 0))
    expect(result.current.isDragging.value).toBe(false)
    spy.mockRestore()
  })

  it("ignores y motion when axis === 'x'", () => {
    const { spy, config } = captureConfig()
    const { result } = renderHook(() => useTouchDrag({ axis: 'x' }))
    const cfg = config()
    cfg.onPanResponderGrant?.({}, gesture())
    cfg.onPanResponderMove?.({}, gesture(50, 200))
    expect(result.current.dragX.value).toBe(50)
    expect(result.current.dragY.value).toBe(0)
    spy.mockRestore()
  })

  it('hard-clamps to constraints when elastic is 0', () => {
    const { spy, config } = captureConfig()
    const { result } = renderHook(() =>
      useTouchDrag({ constraints: { left: -20, right: 20 } }),
    )
    const cfg = config()

    cfg.onPanResponderGrant?.({}, gesture())
    cfg.onPanResponderMove?.({}, gesture(100, 0))
    expect(result.current.dragX.value).toBe(20)

    cfg.onPanResponderMove?.({}, gesture(-100, 0))
    expect(result.current.dragX.value).toBe(-20)
    spy.mockRestore()
  })

  it('rubber-bands overshoot when elastic > 0', () => {
    const { spy, config } = captureConfig()
    const { result } = renderHook(() =>
      useTouchDrag({ constraints: { right: 100 }, elastic: 0.5 }),
    )
    const cfg = config()

    cfg.onPanResponderGrant?.({}, gesture())
    cfg.onPanResponderMove?.({}, gesture(200, 0))
    // Overshoot of 100 past the right bound, scaled by 0.5 → 100 + 50 = 150.
    expect(result.current.dragX.value).toBe(150)
    spy.mockRestore()
  })

  it('normalizes PanResponder velocity (px/ms) to px/sec on onDragEnd', () => {
    const { spy, config } = captureConfig()
    const onDragEnd = jest.fn()
    renderHook(() => useTouchDrag({ onDragEnd }))
    const cfg = config()

    cfg.onPanResponderGrant?.({}, gesture())
    cfg.onPanResponderMove?.({}, gesture(40, 0))
    // PanResponder vx is px/ms — 0.8 here equals 800 px/sec.
    cfg.onPanResponderRelease?.({}, gesture(40, 0, 0.8, -0.2))

    expect(onDragEnd).toHaveBeenCalledWith({
      x: 40,
      y: 0,
      velocity: { x: 800, y: -200 },
    })
    spy.mockRestore()
  })

  it('fires onRelease with normalized velocity, alongside onDragEnd', () => {
    const { spy, config } = captureConfig()
    const onRelease = jest.fn()
    const onDragEnd = jest.fn()
    renderHook(() => useTouchDrag({ onRelease, onDragEnd }))
    const cfg = config()

    cfg.onPanResponderGrant?.({}, gesture())
    cfg.onPanResponderMove?.({}, gesture(70, -10))
    cfg.onPanResponderRelease?.({}, gesture(70, -10, 1.5, 0.2))

    expect(onRelease).toHaveBeenCalledWith({
      x: 70,
      y: -10,
      velocity: { x: 1500, y: 200 },
    })
    expect(onDragEnd).toHaveBeenCalledTimes(1)
    spy.mockRestore()
  })

  it('treats terminate the same as release (gesture canceled by parent)', () => {
    const { spy, config } = captureConfig()
    const onDragEnd = jest.fn()
    const { result } = renderHook(() => useTouchDrag({ onDragEnd }))
    const cfg = config()

    cfg.onPanResponderGrant?.({}, gesture())
    expect(result.current.isDragging.value).toBe(true)
    cfg.onPanResponderMove?.({}, gesture(20, 5))

    cfg.onPanResponderTerminate?.({}, gesture(20, 5, 0, 0))
    expect(result.current.isDragging.value).toBe(false)
    expect(onDragEnd).toHaveBeenCalledWith({
      x: 20,
      y: 5,
      velocity: { x: 0, y: 0 },
    })
    spy.mockRestore()
  })

  it('leaves SVs alone when onRelease returns void / undefined', () => {
    const { spy, config } = captureConfig()
    const onRelease = jest.fn(() => undefined)
    const { result } = renderHook(() => useTouchDrag({ onRelease }))
    const cfg = config()

    cfg.onPanResponderGrant?.({}, gesture())
    cfg.onPanResponderMove?.({}, gesture(25, 25))
    cfg.onPanResponderRelease?.({}, gesture(25, 25, 0, 0))

    expect(result.current.dragX.value).toBe(25)
    expect(result.current.dragY.value).toBe(25)
    spy.mockRestore()
  })
})
