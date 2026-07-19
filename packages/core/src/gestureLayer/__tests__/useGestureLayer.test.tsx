import { act, renderHook } from '@testing-library/react-native'
import { type ReactNode } from 'react'
import * as Reanimated from 'react-native-reanimated'
import { MotionConfig } from '../../config'
import { useGestureLayer } from '../useGestureLayer'

jest.mock('../../gestures', () => ({
  isFocusVisible: jest.fn(() => true),
}))

const { isFocusVisible } = jest.requireMock('../../gestures') as {
  isFocusVisible: jest.Mock<boolean, []>
}

beforeEach(() => {
  jest.restoreAllMocks()
  isFocusVisible.mockReturnValue(true)
})

const md3Halo = {
  rest: { opacity: 0 },
  hovered: { opacity: 0.08 },
  focused: { opacity: 0.1 },
  focusVisible: { opacity: 0.1 },
  pressed: { opacity: 0.12 },
} as const

describe('useGestureLayer — return shape', () => {
  it('returns a style object and a handlers bag', () => {
    const { result } = renderHook(() => useGestureLayer(md3Halo))
    expect(result.current.style).toBeDefined()
    expect(result.current.handlers).toMatchObject({
      onPressIn: expect.any(Function),
      onPressOut: expect.any(Function),
      onHoverIn: expect.any(Function),
      onHoverOut: expect.any(Function),
      onFocus: expect.any(Function),
      onBlur: expect.any(Function),
    })
  })

  it('handler identity is stable across renders', () => {
    const { result, rerender } = renderHook(() => useGestureLayer(md3Halo))
    const first = result.current.handlers
    rerender({})
    expect(result.current.handlers).toBe(first)
  })

  it('at rest, the composed style equals the rest layer', () => {
    const { result } = renderHook(() => useGestureLayer(md3Halo))
    expect(result.current.style.opacity).toBe(0)
  })
})

describe('useGestureLayer — per-state progress shared values', () => {
  it('returns the five progress shared values, all at 0 at rest', () => {
    const { result } = renderHook(() => useGestureLayer(md3Halo))
    const { states } = result.current
    expect(states.hovered.value).toBe(0)
    expect(states.focused.value).toBe(0)
    expect(states.focusVisible.value).toBe(0)
    expect(states.pressed.value).toBe(0)
    expect(states.disabled.value).toBe(0)
  })

  it('gesture handlers drive the exposed shared values', () => {
    const { result } = renderHook(() => useGestureLayer(md3Halo))
    act(() => {
      result.current.handlers.onHoverIn()
      result.current.handlers.onPressIn()
      result.current.handlers.onFocus()
    })
    expect(result.current.states.hovered.value).toBe(1)
    expect(result.current.states.pressed.value).toBe(1)
    expect(result.current.states.focused.value).toBe(1)
    expect(result.current.states.focusVisible.value).toBe(1)

    act(() => {
      result.current.handlers.onHoverOut()
      result.current.handlers.onPressOut()
      result.current.handlers.onBlur()
    })
    expect(result.current.states.hovered.value).toBe(0)
    expect(result.current.states.pressed.value).toBe(0)
    expect(result.current.states.focused.value).toBe(0)
    expect(result.current.states.focusVisible.value).toBe(0)
  })

  it('options.disabled drives states.disabled', () => {
    const { result, rerender } = renderHook(
      ({ disabled }: { disabled: boolean }) =>
        useGestureLayer(md3Halo, { disabled }),
      { initialProps: { disabled: false } },
    )
    expect(result.current.states.disabled.value).toBe(0)

    act(() => {
      rerender({ disabled: true })
    })
    expect(result.current.states.disabled.value).toBe(1)

    act(() => {
      rerender({ disabled: false })
    })
    expect(result.current.states.disabled.value).toBe(0)
  })

  it('states object and its shared values are stable across renders', () => {
    const { result, rerender } = renderHook(() => useGestureLayer(md3Halo))
    const first = result.current.states
    rerender({})
    expect(result.current.states).toBe(first)
    expect(result.current.states.hovered).toBe(first.hovered)
  })

  it('exposed shared values are the same ones the composed style reads', () => {
    // Writing to states.hovered directly must move the composed style —
    // proving they are the driving values, not copies.
    const { result, rerender } = renderHook(() => useGestureLayer(md3Halo))
    act(() => {
      result.current.states.hovered.value = 1
    })
    rerender({})
    expect(result.current.style.opacity).toBeCloseTo(0.08)
  })
})

describe('useGestureLayer — clamped-max composition (numeric keys)', () => {
  it('a single active layer raises the value to its target', () => {
    const { result, rerender } = renderHook(() => useGestureLayer(md3Halo))
    act(() => {
      result.current.handlers.onHoverIn()
    })
    rerender({})
    expect(result.current.style.opacity).toBeCloseTo(0.08)
  })

  it('multiple active layers compose as max, not sum', () => {
    // hover (0.08) + press (0.12) both fully engaged. Sum would be 0.20;
    // clamped-max is 0.12. This is the MD3 halo invariant.
    const { result, rerender } = renderHook(() => useGestureLayer(md3Halo))
    act(() => {
      result.current.handlers.onHoverIn()
      result.current.handlers.onPressIn()
    })
    rerender({})
    expect(result.current.style.opacity).toBeCloseTo(0.12)
  })

  it('rest is the floor — active layers cannot pull below rest', () => {
    // pressed.opacity (0.3) is higher than rest (0.5), so it shouldn't apply;
    // the floor wins.
    const states = {
      rest: { opacity: 0.5 },
      pressed: { opacity: 0.3 },
    }
    const { result, rerender } = renderHook(() => useGestureLayer(states))
    act(() => {
      result.current.handlers.onPressIn()
    })
    rerender({})
    expect(result.current.style.opacity).toBeCloseTo(0.5)
  })

  it('inactive declared layer contributes nothing', () => {
    // Press declared but never engaged — style stays at rest.
    const { result } = renderHook(() => useGestureLayer(md3Halo))
    expect(result.current.style.opacity).toBe(0)
  })
})

describe('useGestureLayer — color cascade composition', () => {
  it('color values cascade with interpolateColor (lowest priority first)', () => {
    // Under the Reanimated mock, interpolateColor(1, [0,1], [a, b]) returns b
    // — so a single hovered layer at full progress produces its target color.
    const states = {
      rest: { backgroundColor: 'transparent' },
      hovered: { backgroundColor: '#ff0000' },
    }
    const { result, rerender } = renderHook(() => useGestureLayer(states))
    act(() => {
      result.current.handlers.onHoverIn()
    })
    rerender({})
    expect(result.current.style.backgroundColor).toBe('#ff0000')
  })

  it('priority cascade: pressed wins over hovered when both at full progress', () => {
    const states = {
      rest: { backgroundColor: 'transparent' },
      hovered: { backgroundColor: '#ff0000' },
      pressed: { backgroundColor: '#00ff00' },
    }
    const { result, rerender } = renderHook(() => useGestureLayer(states))
    act(() => {
      result.current.handlers.onHoverIn()
      result.current.handlers.onPressIn()
    })
    rerender({})
    expect(result.current.style.backgroundColor).toBe('#00ff00')
  })
})

describe('useGestureLayer — disabled flag', () => {
  it('disabled=true drives the disabled layer to full progress', () => {
    const states = {
      rest: { opacity: 1 },
      disabled: { opacity: 0.38 },
    }
    const { result, rerender } = renderHook(
      ({ disabled }: { disabled: boolean }) =>
        useGestureLayer(states, { disabled }),
      { initialProps: { disabled: false } },
    )

    expect(result.current.style.opacity).toBeCloseTo(1)

    act(() => {
      rerender({ disabled: true })
    })
    rerender({ disabled: true })

    expect(result.current.style.opacity).toBeCloseTo(0.38)
  })

  it('disabled overrides active gesture layers', () => {
    const states = {
      rest: { opacity: 0 },
      pressed: { opacity: 0.12 },
      disabled: { opacity: 0 },
    }
    const { result, rerender } = renderHook(() =>
      useGestureLayer(states, { disabled: true }),
    )
    act(() => {
      result.current.handlers.onPressIn()
    })
    rerender({})

    // pressed would push opacity to 0.12; disabled at full progress pulls it
    // back to 0.
    expect(result.current.style.opacity).toBeCloseTo(0)
  })
})

describe('useGestureLayer — transition forwarding', () => {
  it('forwards transition config to the gesture-layer fades', () => {
    const withTiming = jest.spyOn(Reanimated, 'withTiming')
    const { result } = renderHook(() =>
      useGestureLayer(md3Halo, {
        transition: { type: 'timing', duration: 150 },
      }),
    )

    withTiming.mockClear()
    act(() => {
      result.current.handlers.onHoverIn()
    })

    expect(withTiming).toHaveBeenCalled()
    const lastCall = withTiming.mock.calls.at(-1)
    expect(lastCall?.[1]).toMatchObject({ duration: 150 })
  })

  it('respects MotionConfig reducedMotion="always"', () => {
    const withSpring = jest.spyOn(Reanimated, 'withSpring')
    const withTiming = jest.spyOn(Reanimated, 'withTiming')

    const wrapper = ({ children }: { children: ReactNode }) => (
      <MotionConfig reducedMotion="always">{children}</MotionConfig>
    )
    const { result } = renderHook(
      () =>
        useGestureLayer(md3Halo, {
          transition: { type: 'timing', duration: 200 },
        }),
      { wrapper },
    )

    withSpring.mockClear()
    withTiming.mockClear()
    act(() => {
      result.current.handlers.onPressIn()
    })

    expect(withSpring).not.toHaveBeenCalled()
    expect(withTiming).not.toHaveBeenCalled()
  })
})
