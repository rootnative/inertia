import { render, renderHook } from '@testing-library/react-native'
import { type ReactNode } from 'react'
import * as Reanimated from 'react-native-reanimated'
import { MotionConfig, useAnimator, useMotionValue } from '../index'
import { type NamedTransitions } from '../types'

// `useAnimator` is the imperative escape hatch that resolves the transition
// through the same context the declarative surface uses: registered names are
// looked up on the nearest <MotionConfig transitions>, and reduced motion
// downgrades the write to `no-animation`. Under the static Reanimated mock
// `withSpring`/`withTiming` return their first arg synchronously, so we assert
// on the resulting shared value plus the animation-factory spies.

const REGISTRY: NamedTransitions = {
  'state-hover': { type: 'timing', duration: 120 },
  selection: { type: 'spring', tension: 380, friction: 33 },
}

function registryWrapper(transitions: NamedTransitions) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <MotionConfig transitions={transitions}>{children}</MotionConfig>
  }
}

describe('useAnimator', () => {
  beforeEach(() => {
    jest.restoreAllMocks()
  })

  it('defaults to a spring write when no transition is given', () => {
    const withSpring = jest.spyOn(Reanimated, 'withSpring')
    const { result } = renderHook(() => {
      const value = useMotionValue(0)
      const animate = useAnimator()
      return { value, animate }
    })
    result.current.animate(result.current.value, 1)
    expect(withSpring).toHaveBeenCalledTimes(1)
    expect(withSpring.mock.calls[0]![0]).toBe(1)
    expect(result.current.value.value).toBe(1)
  })

  it('honours an inline config', () => {
    const withTiming = jest.spyOn(Reanimated, 'withTiming')
    const withSpring = jest.spyOn(Reanimated, 'withSpring')
    const { result } = renderHook(() => {
      const value = useMotionValue(0)
      const animate = useAnimator()
      return { value, animate }
    })
    result.current.animate(result.current.value, 1, {
      type: 'timing',
      duration: 200,
    })
    expect(withTiming).toHaveBeenCalledTimes(1)
    expect(withTiming.mock.calls[0]![0]).toBe(1)
    expect(withTiming.mock.calls[0]![1]).toMatchObject({ duration: 200 })
    expect(withSpring).not.toHaveBeenCalled()
  })

  it('resolves a registered name from the nearest MotionConfig', () => {
    const withTiming = jest.spyOn(Reanimated, 'withTiming')
    const { result } = renderHook(
      () => {
        const value = useMotionValue(0)
        const animate = useAnimator()
        return { value, animate }
      },
      { wrapper: registryWrapper(REGISTRY) },
    )
    result.current.animate(result.current.value, 1, 'state-hover')
    // 'state-hover' → { type: 'timing', duration: 120 }
    expect(withTiming).toHaveBeenCalledTimes(1)
    expect(withTiming.mock.calls[0]![0]).toBe(1)
    expect(withTiming.mock.calls[0]![1]).toMatchObject({ duration: 120 })
  })

  it('falls back to the default spring for an unknown name', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})
    const withSpring = jest.spyOn(Reanimated, 'withSpring')
    const { result } = renderHook(
      () => {
        const value = useMotionValue(0)
        const animate = useAnimator()
        return { value, animate }
      },
      { wrapper: registryWrapper(REGISTRY) },
    )
    result.current.animate(result.current.value, 1, 'does-not-exist')
    expect(withSpring).toHaveBeenCalledTimes(1)
    expect(result.current.value.value).toBe(1)
    warn.mockRestore()
  })

  it('snaps without calling withSpring / withTiming under reducedMotion="always"', () => {
    const withSpring = jest.spyOn(Reanimated, 'withSpring')
    const withTiming = jest.spyOn(Reanimated, 'withTiming')
    const wrapper = ({ children }: { children: ReactNode }) => (
      <MotionConfig reducedMotion="always">{children}</MotionConfig>
    )
    const { result } = renderHook(
      () => {
        const value = useMotionValue(0)
        const animate = useAnimator()
        return { value, animate }
      },
      { wrapper },
    )
    // Even a named/config transition is downgraded to a direct assignment.
    result.current.animate(result.current.value, 1, {
      type: 'timing',
      duration: 200,
    })
    expect(withTiming).not.toHaveBeenCalled()
    expect(withSpring).not.toHaveBeenCalled()
    expect(result.current.value.value).toBe(1)
  })

  it('returns a callback with stable identity across renders', () => {
    const { result, rerender } = renderHook(() => useAnimator())
    const first = result.current
    rerender({})
    expect(result.current).toBe(first)
  })

  // Was titled "changes callback identity when the registry changes", but the
  // body only ever re-rendered under the *same* provider — it asserted
  // stability and never exercised a registry change at all. Renamed to match
  // what it does; the actual registry-change case is covered below.
  it('keeps its identity across re-renders under a provider', () => {
    const { result, rerender } = renderHook(() => useAnimator(), {
      wrapper: registryWrapper(REGISTRY),
    })
    const first = result.current
    rerender({})
    expect(result.current).toBe(first)
  })
})

// The identity-stability contract is stated in three places (the hook's
// JSDoc, docs/api/hooks.md, and the 0.0.2 changelog) because the whole point
// of `useAnimator` is to be dropped into a memoized event handler. It used to
// depend on `[registry, shouldReduceMotion]`, so a provider republishing its
// transitions — or the reduced-motion flag flipping — handed back a new
// function and churned every handler built on it. The values are read out of
// refs at call time instead, which also means a write always resolves against
// the registry current *when the event fires*.
describe('useAnimator — identity stability', () => {
  it('keeps the same identity across a different provider registry', () => {
    const seen: Array<() => void> = []
    function Probe() {
      const animate = useAnimator()
      seen.push(animate as unknown as () => void)
      return null
    }
    const ui = (transitions: NamedTransitions) => (
      <MotionConfig transitions={transitions}>
        <Probe />
      </MotionConfig>
    )
    const { rerender } = render(ui(REGISTRY))
    rerender(ui({ ...REGISTRY, extra: { type: 'timing', duration: 5 } }))

    expect(seen.length).toBeGreaterThan(1)
    expect(new Set(seen).size).toBe(1)
  })

  it('still resolves against the newest registry after it changes', () => {
    const withTiming = jest.spyOn(Reanimated, 'withTiming')
    const probe: { animate?: ReturnType<typeof useAnimator> } = {}
    function Probe() {
      probe.animate = useAnimator()
      return null
    }
    const ui = (transitions: NamedTransitions) => (
      <MotionConfig transitions={transitions}>
        <Probe />
      </MotionConfig>
    )
    const { rerender } = render(ui(REGISTRY))
    // Redefine the named transition, then call the *same* function reference.
    rerender(ui({ 'state-hover': { type: 'timing', duration: 999 } }))

    const { result } = renderHook(() => useMotionValue(0))
    probe.animate!(result.current, 1, 'state-hover')
    expect(withTiming.mock.calls.at(-1)![1]).toMatchObject({ duration: 999 })
    withTiming.mockRestore()
  })
})
