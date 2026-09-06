import { act, render, renderHook, screen } from '@testing-library/react-native'
import * as Reanimated from 'react-native-reanimated'
import type { SharedValue } from 'react-native-reanimated'
import * as boxShadow from '../internal/boxShadow'
import { __resetWarnOnceForTests } from '../internal/warnOnce'
import {
  Motion,
  MotionConfig,
  Presence,
  useMotionValue,
  useShadow,
  useSpring,
  useVariants,
} from '../index'
import type { AnimationCallbackInfo, VariantController } from '../types'

// Regression tests for the Phase 3 items of the 2026-09-05 audit. Each block
// names the defect it pins. The static Reanimated mock returns identities and
// the spies capture the settle callbacks (third argument), which the tests
// fire by hand to simulate Reanimated reaching a settle point.

type SettleCallback = ((finished?: boolean) => void) | undefined
type WithSpy = jest.SpyInstance<unknown, [unknown, unknown, unknown?]>

function callbacksOf(spy: WithSpy, from: number): SettleCallback[] {
  return spy.mock.calls
    .slice(from)
    .map((call) => call[2] as SettleCallback)
    .filter((cb): cb is (finished?: boolean) => void => cb !== undefined)
}

function getStyle(
  node: { props: { style?: unknown } } | null,
): Record<string, unknown> {
  if (!node) return {}
  const raw = node.props.style
  const flat = Array.isArray(raw) ? raw.flat(Infinity) : [raw]
  return Object.assign({}, ...flat.filter(Boolean))
}

type Probe<T> = { current?: T }

beforeEach(() => {
  jest.restoreAllMocks()
  __resetWarnOnceForTests()
})

describe('<Presence> exit — a superseded animation run cannot release early', () => {
  const VARIANTS = {
    a: { opacity: 1, scale: 1 },
    b: { opacity: 1, scale: 2 },
  }

  function Harness({
    visible,
    controller,
  }: {
    visible: boolean
    controller: VariantController<'a' | 'b'>
  }) {
    return (
      <Presence>
        {visible ? (
          <Motion.View
            key="card"
            testID="card"
            controller={controller}
            variants={VARIANTS}
            exit={{ opacity: 0 }}
            transition={{ type: 'timing', duration: 10_000 }}
          />
        ) : null}
      </Presence>
    )
  }

  it('ignores finished:false drains from the replaced run and waits for the new one', () => {
    const withTiming = jest.spyOn(Reanimated, 'withTiming') as WithSpy
    const { result } = renderHook(() => useVariants(VARIANTS, 'a'))
    const controller = result.current

    const { rerender } = render(
      <Harness visible={true} controller={controller} />,
    )
    const mountCalls = withTiming.mock.calls.length

    // Run A: the exit starts, one settle callback per exiting key.
    rerender(<Harness visible={false} controller={controller} />)
    const runA = callbacksOf(withTiming, mountCalls)
    expect(runA.length).toBeGreaterThan(0)
    const afterRunA = withTiming.mock.calls.length

    // Run B: the controller changes `scale` while the exit is in flight, so
    // the value-driving effect re-runs and replaces run A's animations.
    act(() => controller.transitionTo('b'))
    const runB = callbacksOf(withTiming, afterRunA)
    expect(runB.length).toBeGreaterThan(0)

    // Reanimated fires the replaced animations' callbacks with `false`.
    // Before the fix these drained run A's counter and released <Presence>
    // while run B was still animating.
    act(() => {
      for (const cb of runA) cb?.(false)
    })
    expect(screen.queryByTestId('card')).not.toBeNull()

    // Run B settles → the child is released.
    act(() => {
      for (const cb of runB) cb?.(true)
    })
    expect(screen.queryByTestId('card')).toBeNull()
  })
})

describe('onAnimationEnd — a handler added after mount is wired', () => {
  it('installs the settle callback when onAnimationEnd goes from undefined to defined', () => {
    const withSpring = jest.spyOn(Reanimated, 'withSpring') as WithSpy
    const onEnd = jest.fn<void, [AnimationCallbackInfo<{ opacity: number }>]>()

    const { rerender } = render(
      <Motion.View animate={{ opacity: 1 }} transition={{ type: 'spring' }} />,
    )
    const mountCalls = withSpring.mock.calls.length
    expect(mountCalls).toBeGreaterThan(0)
    // No handler, nothing exiting → no callback was installed.
    expect(callbacksOf(withSpring, 0)).toHaveLength(0)

    rerender(
      <Motion.View
        animate={{ opacity: 1 }}
        transition={{ type: 'spring' }}
        onAnimationEnd={onEnd}
      />,
    )
    const installed = callbacksOf(withSpring, mountCalls)
    expect(installed).toHaveLength(1)

    act(() => installed[0]?.(true))
    expect(onEnd).toHaveBeenCalledTimes(1)
    expect(onEnd.mock.calls[0]![0]).toMatchObject({
      key: 'opacity',
      finished: true,
      phase: 'animation',
    })
  })
})

describe('dev warnings fire once per misconfiguration, not once per render', () => {
  it('animate="<missing variant>" warns once across re-renders', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})
    // Cast: the prop type rejects a key that is not in `variants`; the
    // runtime path is what this test covers.
    const ui = (
      <Motion.View
        animate={'open' as never}
        variants={{ closed: { opacity: 0 } }}
      />
    )
    const { rerender } = render(ui)
    rerender(ui)
    rerender(ui)
    expect(warn).toHaveBeenCalledTimes(1)
    expect(warn.mock.calls[0]![0]).toContain('animate="open"')
  })

  it('<Presence> keyless child warns once across re-renders', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})
    const ui = (
      <Presence>
        <Motion.View animate={{ opacity: 1 }} />
      </Presence>
    )
    const { rerender } = render(ui)
    rerender(ui)
    rerender(ui)
    expect(warn).toHaveBeenCalledTimes(1)
    expect(warn.mock.calls[0]![0]).toContain('must have a `key`')
  })
})

describe('useSpring honours reduced motion', () => {
  it('assigns the target directly and never calls withSpring', () => {
    const withSpring = jest.spyOn(Reanimated, 'withSpring')
    const probe: Probe<SharedValue<number>> = {}
    function SpringProbe({ target }: { target: number }) {
      probe.current = useSpring(target)
      return null
    }
    function Setup({ target }: { target: number }) {
      return (
        <MotionConfig reducedMotion="always">
          <SpringProbe target={target} />
        </MotionConfig>
      )
    }
    const { rerender } = render(<Setup target={1} />)
    rerender(<Setup target={0.25} />)
    expect(withSpring).not.toHaveBeenCalled()
    expect(probe.current!.value).toBe(0.25)
  })
})

describe('repeat count below 1', () => {
  it('runs the animation once on a primitive, without withRepeat, and warns', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})
    const withRepeat = jest.spyOn(Reanimated, 'withRepeat')
    const withSpring = jest.spyOn(Reanimated, 'withSpring')
    render(
      <Motion.View
        animate={{ opacity: 1 }}
        transition={{ type: 'spring', repeat: 0 }}
      />,
    )
    expect(withSpring).toHaveBeenCalled()
    expect(withRepeat).not.toHaveBeenCalled()
    expect(warn).toHaveBeenCalledTimes(1)
    expect(warn.mock.calls[0]![0]).toContain('below 1')
  })
})

describe('useVariants().transitionTo drives a primitive', () => {
  it('re-resolves animate to the new variant and applies it', () => {
    const withTiming = jest.spyOn(Reanimated, 'withTiming')
    const VARIANTS = { closed: { opacity: 0 }, open: { opacity: 1 } }
    const probe: Probe<VariantController<'closed' | 'open'>> = {}
    function Box() {
      const controller = useVariants(VARIANTS, 'closed')
      probe.current = controller
      return (
        <Motion.View
          testID="box"
          controller={controller}
          variants={VARIANTS}
          transition={{ type: 'timing', duration: 120 }}
        />
      )
    }
    const { toJSON, rerender } = render(<Box />)
    expect(getStyle(toJSON() as never).opacity).toBe(0)

    act(() => probe.current!.transitionTo('open'))
    expect(probe.current!.current).toBe('open')
    expect(withTiming).toHaveBeenLastCalledWith(
      1,
      expect.objectContaining({ duration: 120 }),
      undefined,
    )
    // The mock runs the style worklet once per render, so a re-render is
    // needed to read the value the effect wrote into the shared value.
    rerender(<Box />)
    expect(getStyle(toJSON() as never).opacity).toBe(1)
  })
})

describe('Motion.Image runtime path', () => {
  it('renders an Image host and applies animate values to its style', () => {
    const { toJSON } = render(
      <Motion.Image
        testID="img"
        source={{ uri: 'https://example.invalid/x.png' }}
        animate={{ opacity: 0.5, scale: 1.2 }}
        transition={{ type: 'timing', duration: 200 }}
      />,
    )
    const json = toJSON() as { type: string; props: { style?: unknown } }
    expect(json.type).toBe('Image')
    const style = getStyle(json)
    expect(style.opacity).toBe(0.5)
    expect(style.transform).toEqual(
      expect.arrayContaining([expect.objectContaining({ scale: 1.2 })]),
    )
  })
})

describe('useShadow memoises boxShadow pairs on structure', () => {
  it('parses the layers once across re-renders with inline literals', () => {
    const pair = jest.spyOn(boxShadow, 'pairBoxShadowLayers')
    function Setup() {
      const progress = useMotionValue(0)
      useShadow({
        from: { boxShadow: '0 1px 2px #000' },
        to: { boxShadow: '0 4px 8px #000' },
        progress,
      })
      return null
    }
    const { rerender } = render(<Setup />)
    rerender(<Setup />)
    rerender(<Setup />)
    expect(pair).toHaveBeenCalledTimes(1)
  })
})
