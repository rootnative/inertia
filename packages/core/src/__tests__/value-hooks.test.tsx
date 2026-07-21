import { render } from '@testing-library/react-native'
import { useEffect } from 'react'
import * as Reanimated from 'react-native-reanimated'
import * as Worklets from 'react-native-worklets'
import { __resetNonWorkletWarningsForTests } from '../internal/nonWorkletWarning'
import {
  useBooleanSpring,
  useColorTransition,
  useMotionValue,
  useScroll,
  useShadow,
  useSpring,
  useTransform,
} from '../values'

// Value-layer hooks acceptance: each hook must return a Reanimated-shaped
// shared value (`{ value: ... }`) and react to inputs in the way the docs
// claim. Frame-level physics isn't observable under the static mock — these
// tests assert wiring (correct Reanimated calls, correct read-throughs)
// rather than animation curves.

type Probe<T = unknown> = { current?: T }

// Tiny harness: a component that runs the hook under test and assigns the
// resulting shared value (or whole probe object) to a ref-shaped POJO so
// the test can inspect it after render. Using a component (vs renderHook)
// keeps us on the same `render` path the rest of the suite uses and avoids
// pulling in `@testing-library/react-hooks`.
function HookProbe<T>({ use, probe }: { use: () => T; probe: Probe<T> }): null {
  probe.current = use()
  return null
}

beforeEach(() => {
  jest.restoreAllMocks()
})

describe('useMotionValue', () => {
  it('returns a Reanimated-shaped shared value seeded with the initial', () => {
    const probe: Probe<{ value: number }> = {}
    render(<HookProbe use={() => useMotionValue(42)} probe={probe} />)
    expect(probe.current).toBeDefined()
    expect(probe.current!.value).toBe(42)
  })

  it('preserves identity across re-renders', () => {
    const probe: Probe<{ value: number }> = {}
    const { rerender } = render(
      <HookProbe use={() => useMotionValue(0)} probe={probe} />,
    )
    const first = probe.current
    rerender(<HookProbe use={() => useMotionValue(0)} probe={probe} />)
    expect(probe.current).toBe(first)
  })

  it('JS writes via `.value =` survive re-renders', () => {
    const probe: Probe<{ value: number }> = {}
    render(<HookProbe use={() => useMotionValue(0)} probe={probe} />)
    probe.current!.value = 100
    expect(probe.current!.value).toBe(100)
  })
})

describe('useSpring', () => {
  it('drives the output toward a plain-number target via withSpring', () => {
    const withSpring = jest.spyOn(Reanimated, 'withSpring')
    const probe: Probe<{ value: number }> = {}
    render(
      <HookProbe
        use={() => useSpring(80, { tension: 200, friction: 18 })}
        probe={probe}
      />,
    )
    // The mock returns the target value from withSpring, so the output
    // shared value should equal the target after the mount effect.
    expect(probe.current!.value).toBe(80)
    expect(withSpring).toHaveBeenCalled()
    const [target, config] = withSpring.mock.calls[0]!
    expect(target).toBe(80)
    // react-spring vocabulary translated to Reanimated raw names.
    expect(config).toMatchObject({ stiffness: 200, damping: 18 })
  })

  it('does not re-invoke withSpring when the target is unchanged', () => {
    const withSpring = jest.spyOn(Reanimated, 'withSpring')
    const probe: Probe<{ value: number }> = {}
    const { rerender } = render(
      <HookProbe use={() => useSpring(80)} probe={probe} />,
    )
    const callsAfterMount = withSpring.mock.calls.length
    rerender(<HookProbe use={() => useSpring(80)} probe={probe} />)
    rerender(<HookProbe use={() => useSpring(80)} probe={probe} />)
    expect(withSpring.mock.calls.length).toBe(callsAfterMount)
  })

  it('accepts a SharedValue target and pipes it through a UI-thread reaction', () => {
    const withSpring = jest.spyOn(Reanimated, 'withSpring')
    const probe: Probe<{ value: number }> = {}

    function Setup() {
      const source = useMotionValue(0)
      const out = useSpring(source)
      // Drive the source from a JS effect so the reaction has something to
      // react to under the mock (which fires `react` once with the prepare
      // result).
      useEffect(() => {
        source.value = 50
      }, [source])
      probe.current = out
      return null
    }
    render(<Setup />)
    // Reaction fires synchronously under the mock with the initial-read
    // value (0), then the JS effect bumps the source — there's no real
    // tick under the mock to re-fire the reaction, so we just assert that
    // withSpring was invoked at least once with the read source value.
    expect(withSpring).toHaveBeenCalled()
    expect(typeof probe.current!.value).toBe('number')
  })
})

describe('useBooleanSpring', () => {
  it('drives the output to 1 when active is true', () => {
    const withSpring = jest.spyOn(Reanimated, 'withSpring')
    const probe: Probe<{ value: number }> = {}
    render(<HookProbe use={() => useBooleanSpring(true)} probe={probe} />)
    expect(probe.current!.value).toBe(1)
    expect(withSpring).toHaveBeenCalled()
    expect(withSpring.mock.calls[0]![0]).toBe(1)
  })

  it('drives the output to 0 when active is false', () => {
    const probe: Probe<{ value: number }> = {}
    render(<HookProbe use={() => useBooleanSpring(false)} probe={probe} />)
    expect(probe.current!.value).toBe(0)
  })

  it('re-targets when active flips', () => {
    const withSpring = jest.spyOn(Reanimated, 'withSpring')
    const probe: Probe<{ value: number }> = {}
    const { rerender } = render(
      <HookProbe use={() => useBooleanSpring(false)} probe={probe} />,
    )
    const callsBefore = withSpring.mock.calls.length
    rerender(<HookProbe use={() => useBooleanSpring(true)} probe={probe} />)
    expect(probe.current!.value).toBe(1)
    expect(withSpring.mock.calls.length).toBeGreaterThan(callsBefore)
    expect(withSpring.mock.calls.at(-1)![0]).toBe(1)
  })

  it('forwards the spring config to withSpring with react-spring vocabulary', () => {
    const withSpring = jest.spyOn(Reanimated, 'withSpring')
    const probe: Probe<{ value: number }> = {}
    render(
      <HookProbe
        use={() => useBooleanSpring(true, { tension: 240, friction: 22 })}
        probe={probe}
      />,
    )
    const [, config] = withSpring.mock.calls.at(-1)!
    expect(config).toMatchObject({ stiffness: 240, damping: 22 })
  })
})

describe('useTransform', () => {
  it('interpolates a numeric output range', () => {
    const interpolate = jest.spyOn(Reanimated, 'interpolate')
    const probe: Probe<{ value: number }> = {}
    function Setup() {
      const x = useMotionValue(0)
      x.value = 1 // drive the source to the end of the range under the mock
      const opacity = useTransform(x, [0, 1], [0, 0.5])
      probe.current = opacity
      return null
    }
    render(<Setup />)
    expect(interpolate).toHaveBeenCalled()
    // Mock returns the last output when value >= 1.
    expect(probe.current!.value).toBe(0.5)
  })

  it('interpolates a color output range via interpolateColor', () => {
    const interpolateColor = jest.spyOn(Reanimated, 'interpolateColor')
    const probe: Probe<{ value: string }> = {}
    function Setup() {
      const x = useMotionValue(0)
      x.value = 1
      const color = useTransform(x, [0, 1], ['#fff', '#000'])
      probe.current = color
      return null
    }
    render(<Setup />)
    expect(interpolateColor).toHaveBeenCalled()
    expect(probe.current!.value).toBe('#000')
  })

  it('accepts a transformer function overload', () => {
    const probe: Probe<{ value: number }> = {}
    function Setup() {
      const x = useMotionValue(3)
      const squared = useTransform(() => x.value * x.value)
      probe.current = squared
      return null
    }
    render(<Setup />)
    expect(probe.current!.value).toBe(9)
  })

  describe('non-worklet transformer dev warning', () => {
    // The warning is suppressed under Jest (the shared stubs report every
    // function as non-worklet, which would make it pure noise), so these
    // tests lift the suppression by clearing JEST_WORKER_ID.
    const originalWorkerId = process.env.JEST_WORKER_ID

    beforeEach(() => {
      __resetNonWorkletWarningsForTests()
      delete process.env.JEST_WORKER_ID
    })

    afterEach(() => {
      process.env.JEST_WORKER_ID = originalWorkerId
    })

    it('warns once when the transformer is a plain function', () => {
      const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})
      function Setup() {
        const x = useMotionValue(1)
        useTransform(() => x.value)
        useTransform(() => x.value * 2)
        return null
      }
      render(<Setup />)
      expect(warn).toHaveBeenCalledTimes(1)
      expect(warn.mock.calls[0]![0]).toContain("'worklet'")
      warn.mockRestore()
    })

    it('does not warn for worklet transformers or interpolation overloads', () => {
      const isWorklet = jest
        .spyOn(Worklets, 'isWorkletFunction')
        .mockReturnValue(true)
      const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})
      function Setup() {
        const x = useMotionValue(0)
        useTransform(() => x.value)
        useTransform(x, [0, 1], [0, 1])
        return null
      }
      render(<Setup />)
      expect(warn).not.toHaveBeenCalled()
      warn.mockRestore()
      isWorklet.mockRestore()
    })

    it('stays silent under the Jest worker env', () => {
      process.env.JEST_WORKER_ID = originalWorkerId ?? '1'
      const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})
      function Setup() {
        const x = useMotionValue(1)
        useTransform(() => x.value)
        return null
      }
      render(<Setup />)
      expect(warn).not.toHaveBeenCalled()
      warn.mockRestore()
    })
  })
})

describe('useShadow', () => {
  it('interpolates flat shadow keys plus shadowOffset between two configs', () => {
    const probe: Probe<Record<string, unknown>> = {}
    function Setup() {
      const progress = useMotionValue(0)
      progress.value = 1 // drive to `to` under the mock (interpolate returns last output)
      const style = useShadow({
        from: {
          shadowOpacity: 0,
          shadowRadius: 0,
          shadowOffset: { width: 0, height: 0 },
          elevation: 0,
          shadowColor: 'rgba(0,0,0,0)',
        },
        to: {
          shadowOpacity: 0.24,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 8 },
          elevation: 8,
          shadowColor: '#000000',
        },
        progress,
      })
      probe.current = style as Record<string, unknown>
      return null
    }
    render(<Setup />)
    const style = probe.current!
    expect(style.shadowOpacity).toBe(0.24)
    expect(style.shadowRadius).toBe(12)
    expect(style.elevation).toBe(8)
    expect(style.shadowColor).toBe('#000000')
    expect(style.shadowOffset).toEqual({ width: 0, height: 8 })
  })

  it('omits keys that are absent from both from and to', () => {
    const probe: Probe<Record<string, unknown>> = {}
    function Setup() {
      const progress = useMotionValue(1)
      const style = useShadow({
        from: { shadowOpacity: 0 },
        to: { shadowOpacity: 0.5 },
        progress,
      })
      probe.current = style as Record<string, unknown>
      return null
    }
    render(<Setup />)
    const keys = Object.keys(probe.current!)
    expect(keys).toEqual(['shadowOpacity'])
  })

  it('defaults the absent side to zero for one-sided keys', () => {
    const interpolate = jest.spyOn(Reanimated, 'interpolate')
    function Setup() {
      const progress = useMotionValue(1)
      // `shadowRadius` only on `to` — the `from` side defaults to 0.
      useShadow({
        from: { shadowOpacity: 0 },
        to: { shadowOpacity: 0.5, shadowRadius: 8 },
        progress,
      })
      return null
    }
    render(<Setup />)
    const radiusCall = interpolate.mock.calls.find(
      ([, , output]) => Array.isArray(output) && output[1] === 8,
    )
    expect(radiusCall).toBeDefined()
    expect(radiusCall![2]).toEqual([0, 8])
  })
})

describe('useColorTransition', () => {
  it('interpolates between two colors under the default backgroundColor key', () => {
    const interpolateColor = jest.spyOn(Reanimated, 'interpolateColor')
    const probe: Probe<Record<string, unknown>> = {}
    function Setup() {
      const progress = useMotionValue(0)
      progress.value = 1
      const style = useColorTransition(progress, ['#ffffff', '#000000'])
      probe.current = style as Record<string, unknown>
      return null
    }
    render(<Setup />)
    expect(interpolateColor).toHaveBeenCalled()
    expect(probe.current!.backgroundColor).toBe('#000000')
    expect(Object.keys(probe.current!)).toEqual(['backgroundColor'])
  })

  it('routes the interpolated color into the configured key', () => {
    const probe: Probe<Record<string, unknown>> = {}
    function Setup() {
      const progress = useMotionValue(1)
      const style = useColorTransition(progress, ['#ffffff', '#4f46e5'], {
        key: 'borderColor',
      })
      probe.current = style as Record<string, unknown>
      return null
    }
    render(<Setup />)
    expect(probe.current!.borderColor).toBe('#4f46e5')
    expect(probe.current!.backgroundColor).toBeUndefined()
  })

  it('passes the [0, 1] domain and the from/to range straight through', () => {
    const interpolateColor = jest.spyOn(Reanimated, 'interpolateColor')
    function Setup() {
      const progress = useMotionValue(0.5)
      useColorTransition(progress, ['#ff0000', '#00ff00'])
      return null
    }
    render(<Setup />)
    const call = interpolateColor.mock.calls.at(-1)!
    expect(call[1]).toEqual([0, 1])
    expect(call[2]).toEqual(['#ff0000', '#00ff00'])
  })
})

describe('useScroll', () => {
  it('returns x/y shared values and an onScroll handler', () => {
    const probe: Probe<ReturnType<typeof useScroll>> = {}
    render(<HookProbe use={() => useScroll()} probe={probe} />)
    const result = probe.current!
    expect(result.scrollX.value).toBe(0)
    expect(result.scrollY.value).toBe(0)
    expect(typeof result.onScroll).toBe('function')
  })

  it('updates shared values when the handler is called with a scroll event', () => {
    const probe: Probe<ReturnType<typeof useScroll>> = {}
    render(<HookProbe use={() => useScroll()} probe={probe} />)
    const { scrollX, scrollY, onScroll } = probe.current!
    // The mock unwraps to onScroll(event.nativeEvent ?? event), so we hand
    // it the bare scroll-event shape directly.
    ;(onScroll as unknown as (e: unknown) => void)({
      contentOffset: { x: 24, y: 480 },
    })
    expect(scrollX.value).toBe(24)
    expect(scrollY.value).toBe(480)
  })
})
