import { render } from '@testing-library/react-native'
import * as Reanimated from 'react-native-reanimated'
import { Motion } from '../../motion'
import { ensureWorkletEasing } from '../easing'
import { resolveTransition } from '../resolve'

// Phase-2 acceptance: custom easing functions inside nested-transition
// contexts (variants, sequences, per-property maps) must not crash with
// `[Reanimated] The easing function is not a worklet`. The library wraps
// plain functions at JS time so consumers never have to think about the
// worklet boundary.

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
    // jest.setup mocks isWorkletFunction → false, so override locally.
    const isWorklet = jest
      .spyOn(Reanimated, 'isWorkletFunction')
      .mockReturnValue(true)
    const fn = (t: number) => t
    expect(ensureWorkletEasing(fn)).toBe(fn)
    isWorklet.mockRestore()
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
