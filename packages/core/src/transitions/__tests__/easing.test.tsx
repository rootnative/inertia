import { render } from '@testing-library/react-native'
import * as Reanimated from 'react-native-reanimated'
import * as Worklets from 'react-native-worklets'
import { __resetNonWorkletWarningsForTests } from '../../internal/nonWorkletWarning'
import { Motion } from '../../motion'
import { ensureWorkletEasing } from '../easing'
import { resolveTransition } from '../resolve'

// Phase-2 acceptance: custom easing functions inside nested-transition
// contexts (variants, sequences, per-property maps) must not crash with
// `[Reanimated] The easing function is not a worklet`. Plain functions get
// a best-effort call-through wrapper (web-only — the real contract is that
// custom easings are worklets, and plain functions dev-warn outside Jest).

describe('ensureWorkletEasing', () => {
  it('returns undefined when no easing is provided', () => {
    expect(ensureWorkletEasing(undefined)).toBeUndefined()
  })

  it('wraps plain functions so the underlying fn still runs', () => {
    const userFn = jest.fn((t: number) => t * t)
    const wrapped = ensureWorkletEasing(userFn)
    expect(wrapped).toBeDefined()
    expect(wrapped).not.toBe(userFn) // a fresh wrapper, not the same reference
    expect(wrapped!(0.5)).toBe(0.25)
    expect(userFn).toHaveBeenCalledWith(0.5)
  })

  it('passes already-worklet functions through unchanged', () => {
    // jest.setup mocks isWorkletFunction → false, so override locally. The
    // source-of-truth import is `react-native-worklets` now; the Reanimated
    // re-export is deprecated.
    const isWorklet = jest
      .spyOn(Worklets, 'isWorkletFunction')
      .mockReturnValue(true)
    const fn = (t: number) => t
    expect(ensureWorkletEasing(fn)).toBe(fn)
    isWorklet.mockRestore()
  })

  it('unwraps a Reanimated 4 EasingFunctionFactory and wraps the inner fn', () => {
    // `Easing.bezier(0.4, 0, 0.2, 1)` in Reanimated 4 returns
    // `{ factory: () => (t) => number }`, not the function itself. The helper
    // unwraps before deciding whether to worklet-wrap.
    const inner = jest.fn((t: number) => t * 3)
    const factory = { factory: () => inner }
    const wrapped = ensureWorkletEasing(factory)
    expect(wrapped).toBeDefined()
    expect(wrapped).not.toBe(inner) // wrapped, since inner isn't a worklet
    expect(wrapped!(0.25)).toBe(0.75)
    expect(inner).toHaveBeenCalledWith(0.25)
  })

  it('returns an EasingFunctionFactory inner fn unchanged when it is already a worklet', () => {
    const isWorklet = jest
      .spyOn(Worklets, 'isWorkletFunction')
      .mockReturnValue(true)
    const inner = (t: number) => t
    const factory = { factory: () => inner }
    // Inner is unwrapped and recognized as a worklet — no extra wrapping.
    expect(ensureWorkletEasing(factory)).toBe(inner)
    isWorklet.mockRestore()
  })

  describe('non-worklet dev warning', () => {
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

    it('warns once (not per call) when wrapping plain easing fns', () => {
      const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})
      ensureWorkletEasing((t: number) => t)
      ensureWorkletEasing((t: number) => t * t)
      expect(warn).toHaveBeenCalledTimes(1)
      expect(warn.mock.calls[0]![0]).toContain("'worklet'")
      warn.mockRestore()
    })

    it('does not warn for worklet easings', () => {
      const isWorklet = jest
        .spyOn(Worklets, 'isWorkletFunction')
        .mockReturnValue(true)
      const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})
      ensureWorkletEasing((t: number) => t)
      expect(warn).not.toHaveBeenCalled()
      warn.mockRestore()
      isWorklet.mockRestore()
    })

    it('stays silent under the Jest worker env', () => {
      process.env.JEST_WORKER_ID = originalWorkerId ?? '1'
      const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})
      ensureWorkletEasing((t: number) => t)
      expect(warn).not.toHaveBeenCalled()
      warn.mockRestore()
    })
  })
})

describe('custom easing inside variant transition (Phase-2 acceptance)', () => {
  it('does not crash when a variant transition supplies a plain easing fn', () => {
    const variants = {
      open: { opacity: 1 },
      closed: { opacity: 0 },
    } as const

    expect(() =>
      render(
        <Motion.View
          variants={variants}
          animate="open"
          transition={{
            opacity: {
              type: 'timing',
              duration: 200,
              easing: (t) => 1 - (1 - t) * (1 - t),
            },
          }}
        />,
      ),
    ).not.toThrow()
  })

  it('forwards a wrapped easing fn (not the raw one) to withTiming', () => {
    const withTiming = jest.spyOn(Reanimated, 'withTiming')
    const userEasing = (t: number) => t * t

    resolveTransition({ type: 'timing', duration: 200, easing: userEasing }, 1)

    expect(withTiming).toHaveBeenCalledTimes(1)
    const cfg = withTiming.mock.calls[0]![1] as { easing: unknown }
    expect(cfg.easing).toBeDefined()
    // The resolver must wrap (not pass through) — that's what dodges the
    // Reanimated 3.9+ runtime worklet validation crash.
    expect(cfg.easing).not.toBe(userEasing)
  })
})
