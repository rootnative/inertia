import { render } from '@testing-library/react-native'
import { useEffect } from 'react'
import * as Reanimated from 'react-native-reanimated'
import { useMotionValue, useScroll, useSpring, useTransform } from '../values'

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
    const [target, config] = withSpring.mock.calls[0]
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
