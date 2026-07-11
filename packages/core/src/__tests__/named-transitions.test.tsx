import { render, renderHook } from '@testing-library/react-native'
import { type ReactNode } from 'react'
import * as Reanimated from 'react-native-reanimated'
import {
  Motion,
  MotionConfig,
  resolveNamedTransition,
  useAnimation,
  useBooleanSpring,
  useGesture,
  useMotionConfig,
  useSpring,
} from '../index'
import { useGestureLayer } from '../gestureLayer'
import { type NamedTransitions, type TransitionConfig } from '../types'

// §3.1 named transition registry: names registered on <MotionConfig
// transitions> are accepted anywhere a TransitionConfig is. Semantics under
// test: nearest-provider resolution, nested-provider merge (child overrides),
// unknown-name dev warning + default-spring fallback, and acceptance across
// the transition prop (top-level + per-property), the layout prop, and the
// value-layer hooks.

const REGISTRY: NamedTransitions = {
  'state-press': { type: 'timing', duration: 100 },
  selection: { type: 'spring', tension: 380, friction: 33 },
}

function providerFor(transitions: NamedTransitions) {
  return function Provider({ children }: { children: ReactNode }) {
    return <MotionConfig transitions={transitions}>{children}</MotionConfig>
  }
}

describe('named transitions — registry semantics', () => {
  beforeEach(() => {
    jest.restoreAllMocks()
  })

  it('resolveNamedTransition passes configs through and looks names up', () => {
    const cfg: TransitionConfig = { type: 'timing', duration: 50 }
    expect(resolveNamedTransition(cfg, REGISTRY)).toBe(cfg)
    expect(resolveNamedTransition(undefined, REGISTRY)).toBeUndefined()
    expect(resolveNamedTransition('selection', REGISTRY)).toBe(
      REGISTRY.selection,
    )
  })

  it('warns in dev and falls back to the default spring for unknown names', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})
    expect(resolveNamedTransition('nope', REGISTRY)).toEqual({
      type: 'spring',
    })
    expect(warn).toHaveBeenCalledTimes(1)
    expect(warn.mock.calls[0]![0]).toContain('Unknown transition name "nope"')
  })

  it('merges nested providers with child overriding same-named entries', () => {
    const { result } = renderHook(() => useMotionConfig(), {
      wrapper: ({ children }: { children: ReactNode }) => (
        <MotionConfig
          transitions={{
            selection: { type: 'spring', tension: 100 },
            'state-press': { type: 'timing', duration: 100 },
          }}
        >
          <MotionConfig
            transitions={{ selection: { type: 'timing', duration: 999 } }}
          >
            {children}
          </MotionConfig>
        </MotionConfig>
      ),
    })
    expect(result.current.transitions).toEqual({
      selection: { type: 'timing', duration: 999 },
      'state-press': { type: 'timing', duration: 100 },
    })
  })

  it('nested providers inherit reducedMotion from the ancestor when omitted', () => {
    const { result } = renderHook(() => useMotionConfig(), {
      wrapper: ({ children }: { children: ReactNode }) => (
        <MotionConfig reducedMotion="never">
          <MotionConfig transitions={REGISTRY}>{children}</MotionConfig>
        </MotionConfig>
      ),
    })
    expect(result.current.reducedMotion).toBe('never')
  })
})

describe('named transitions — Motion primitives', () => {
  beforeEach(() => {
    jest.restoreAllMocks()
  })

  it('accepts a name as the top-level transition prop', () => {
    const withTiming = jest.spyOn(Reanimated, 'withTiming')
    render(
      <MotionConfig transitions={REGISTRY}>
        <Motion.View
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition="state-press"
        />
      </MotionConfig>,
    )
    expect(withTiming).toHaveBeenCalled()
    expect(withTiming.mock.calls[0]![1]).toMatchObject({ duration: 100 })
  })

  it('accepts names as per-property transition values', () => {
    const withTiming = jest.spyOn(Reanimated, 'withTiming')
    const withSpring = jest.spyOn(Reanimated, 'withSpring')
    render(
      <MotionConfig transitions={REGISTRY}>
        <Motion.View
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ opacity: 'state-press', scale: 'selection' }}
        />
      </MotionConfig>,
    )
    expect(withTiming).toHaveBeenCalledTimes(1)
    expect(withTiming.mock.calls[0]![1]).toMatchObject({ duration: 100 })
    // selection: tension 380 / friction 33 → stiffness 380 / damping 33.
    expect(withSpring).toHaveBeenCalledTimes(1)
    expect(withSpring.mock.calls[0]![1]).toMatchObject({
      stiffness: 380,
      damping: 33,
    })
  })

  it('falls back to the default spring for an unknown name on a primitive', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})
    const withSpring = jest.spyOn(Reanimated, 'withSpring')
    render(
      <MotionConfig transitions={REGISTRY}>
        <Motion.View
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition="missing-name"
        />
      </MotionConfig>,
    )
    expect(warn).toHaveBeenCalled()
    expect(withSpring).toHaveBeenCalled()
  })

  it('accepts a name on the layout prop', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})
    const { toJSON } = render(
      <MotionConfig transitions={REGISTRY}>
        <Motion.View layout="state-press" />
      </MotionConfig>,
    )
    expect(toJSON()).toBeTruthy()
    // A registered name resolves silently; the unknown-name warning firing
    // here would mean the layout prop never reached the registry.
    expect(warn).not.toHaveBeenCalled()

    render(
      <MotionConfig transitions={REGISTRY}>
        <Motion.View layout="missing-name" />
      </MotionConfig>,
    )
    expect(warn).toHaveBeenCalledTimes(1)
    expect(warn.mock.calls[0]![0]).toContain('missing-name')
  })

  it('resolves names without any provider to the default spring', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})
    const withSpring = jest.spyOn(Reanimated, 'withSpring')
    render(
      <Motion.View
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition="selection"
      />,
    )
    expect(warn).toHaveBeenCalled()
    expect(withSpring).toHaveBeenCalled()
  })
})

describe('named transitions — value-layer hooks', () => {
  beforeEach(() => {
    jest.restoreAllMocks()
  })

  it('useAnimation honors a named timing transition', () => {
    const withTiming = jest.spyOn(Reanimated, 'withTiming')
    renderHook(() => useAnimation(1, 'state-press'), {
      wrapper: providerFor(REGISTRY),
    })
    expect(withTiming).toHaveBeenCalledTimes(1)
    expect(withTiming.mock.calls[0]![1]).toMatchObject({ duration: 100 })
  })

  it('useSpring / useBooleanSpring honor a named spring', () => {
    const withSpring = jest.spyOn(Reanimated, 'withSpring')
    renderHook(() => useBooleanSpring(true, 'selection'), {
      wrapper: providerFor(REGISTRY),
    })
    expect(withSpring).toHaveBeenCalledTimes(1)
    expect(withSpring.mock.calls[0]![1]).toMatchObject({
      stiffness: 380,
      damping: 33,
    })
  })

  it('useSpring warns and uses the default spring for a non-spring name', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})
    const withSpring = jest.spyOn(Reanimated, 'withSpring')
    const withTiming = jest.spyOn(Reanimated, 'withTiming')
    renderHook(() => useSpring(1, 'state-press'), {
      wrapper: providerFor(REGISTRY),
    })
    expect(warn).toHaveBeenCalledTimes(1)
    expect(warn.mock.calls[0]![0]).toContain('spring-only')
    expect(withTiming).not.toHaveBeenCalled()
    expect(withSpring).toHaveBeenCalledTimes(1)
    // Library default spring: tension 170 / friction 26.
    expect(withSpring.mock.calls[0]![1]).toMatchObject({
      stiffness: 170,
      damping: 26,
    })
  })

  it('useGesture resolves per-layer names', () => {
    const withTiming = jest.spyOn(Reanimated, 'withTiming')
    const { result } = renderHook(
      () => useGesture({ pressed: 'state-press' }),
      { wrapper: providerFor(REGISTRY) },
    )
    result.current.handlers.onPressIn()
    expect(withTiming).toHaveBeenCalledTimes(1)
    expect(withTiming.mock.calls[0]![0]).toBe(1)
    expect(withTiming.mock.calls[0]![1]).toMatchObject({ duration: 100 })
  })

  it('useGestureLayer resolves a top-level name (including the disabled layer)', () => {
    const withTiming = jest.spyOn(Reanimated, 'withTiming')
    renderHook(
      () =>
        useGestureLayer(
          { rest: { opacity: 0 }, pressed: { opacity: 0.12 } },
          { disabled: true, transition: 'state-press' },
        ),
      { wrapper: providerFor(REGISTRY) },
    )
    // The disabled layer animates its progress toward 1 on mount using the
    // named timing config.
    expect(withTiming).toHaveBeenCalled()
    expect(withTiming.mock.calls[0]![1]).toMatchObject({ duration: 100 })
  })
})
