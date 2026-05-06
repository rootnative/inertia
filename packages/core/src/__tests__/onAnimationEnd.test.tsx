import { render } from '@testing-library/react-native'
import * as Reanimated from 'react-native-reanimated'
import { Motion } from '../motion'
import type { AnimationCallbackInfo } from '../types'

// Phase-2 acceptance: `onAnimationEnd` callback shape is
// `{ phase: 'step' | 'sequence' | 'repeat' | 'animation', step, iteration, ... }`.
// We assert each phase fires at the right time:
//
//   - `'step'`      — non-final keyframe in a sequence settles
//   - `'sequence'`  — last keyframe of a non-final iteration (sequence is about to repeat)
//   - `'repeat'`    — non-final iteration of a non-sequence animation
//   - `'animation'` — terminal phase, no more passes
//
// The static-render Reanimated mock doesn't actually run animations, but it
// captures the callback Reanimated would fire on settle as the third arg of
// `withSpring` / `withTiming`. We invoke those captured callbacks manually to
// simulate Reanimated reaching each settle point, then assert what
// `onAnimationEnd` saw.

type SpringSpy = jest.SpyInstance<
  unknown,
  Parameters<typeof Reanimated.withSpring>
>

function settleAll(spy: SpringSpy) {
  // Each `withSpring(toValue, cfg, cb)` call captured by the spy holds the
  // settle callback as its third arg. Invoke them in order to simulate the
  // sequence playing through.
  for (const call of spy.mock.calls) {
    const cb = call[2] as ((finished?: boolean) => void) | undefined
    cb?.(true)
  }
}

function settle(spy: SpringSpy, callIndex: number) {
  const cb = spy.mock.calls[callIndex]![2] as
    | ((finished?: boolean) => void)
    | undefined
  cb?.(true)
}

beforeEach(() => {
  jest.restoreAllMocks()
})

describe('onAnimationEnd — phase mapping', () => {
  it('single-shot animation fires phase=animation with step=undefined', () => {
    const withSpring = jest.spyOn(Reanimated, 'withSpring')
    const onEnd = jest.fn<void, [AnimationCallbackInfo<{ opacity: number }>]>()

    render(
      <Motion.View
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ type: 'spring' }}
        onAnimationEnd={onEnd}
      />,
    )

    expect(withSpring).toHaveBeenCalledTimes(1)
    settle(withSpring, 0)

    expect(onEnd).toHaveBeenCalledTimes(1)
    expect(onEnd).toHaveBeenCalledWith(
      expect.objectContaining({
        key: 'opacity',
        finished: true,
        phase: 'animation',
        step: undefined,
        iteration: 0,
      }),
    )
  })

  it('sequence fires step,step,...,animation', () => {
    const withSpring = jest.spyOn(Reanimated, 'withSpring')
    const onEnd = jest.fn<
      void,
      [AnimationCallbackInfo<{ translateX: number }>]
    >()

    render(
      <Motion.View
        initial={{ translateX: 0 }}
        animate={{ translateX: [0, 50, 100] }}
        transition={{ type: 'spring' }}
        onAnimationEnd={onEnd}
      />,
    )

    // Three steps → three withSpring calls, each with its own callback.
    expect(withSpring).toHaveBeenCalledTimes(3)
    settleAll(withSpring)

    expect(onEnd).toHaveBeenCalledTimes(3)
    const phases = onEnd.mock.calls.map(([info]) => ({
      phase: info.phase,
      step: info.step,
      iteration: info.iteration,
    }))
    expect(phases).toEqual([
      { phase: 'step', step: 0, iteration: 0 },
      { phase: 'step', step: 1, iteration: 0 },
      { phase: 'animation', step: 2, iteration: 0 },
    ])
  })

  it('non-sequence repeat fires repeat,repeat,...,animation', () => {
    const withSpring = jest.spyOn(Reanimated, 'withSpring')
    const onEnd = jest.fn<void, [AnimationCallbackInfo<{ opacity: number }>]>()

    render(
      <Motion.View
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ type: 'spring', repeat: 3 }}
        onAnimationEnd={onEnd}
      />,
    )

    // Single-shot setup → one withSpring call. Reanimated would fire the same
    // callback on each iteration of `withRepeat`; simulate that.
    expect(withSpring).toHaveBeenCalledTimes(1)
    settle(withSpring, 0)
    settle(withSpring, 0)
    settle(withSpring, 0)

    expect(onEnd).toHaveBeenCalledTimes(3)
    const phases = onEnd.mock.calls.map(([info]) => ({
      phase: info.phase,
      iteration: info.iteration,
    }))
    expect(phases).toEqual([
      { phase: 'repeat', iteration: 0 },
      { phase: 'repeat', iteration: 1 },
      { phase: 'animation', iteration: 2 },
    ])
  })

  it('sequence + repeat fires step,step,sequence,step,step,animation', () => {
    const withSpring = jest.spyOn(Reanimated, 'withSpring')
    const onEnd = jest.fn<
      void,
      [AnimationCallbackInfo<{ translateX: number }>]
    >()

    render(
      <Motion.View
        initial={{ translateX: 0 }}
        animate={{ translateX: [0, 50, 100] }}
        transition={{ type: 'spring', repeat: 2 }}
        onAnimationEnd={onEnd}
      />,
    )

    expect(withSpring).toHaveBeenCalledTimes(3)
    // Iteration 0: settle step 0, 1, 2.
    settleAll(withSpring)
    // Iteration 1: settle step 0, 1, 2 again (Reanimated fires the same step
    // callbacks on each repeat pass).
    settleAll(withSpring)

    expect(onEnd).toHaveBeenCalledTimes(6)
    const phases = onEnd.mock.calls.map(([info]) => ({
      phase: info.phase,
      step: info.step,
      iteration: info.iteration,
    }))
    expect(phases).toEqual([
      { phase: 'step', step: 0, iteration: 0 },
      { phase: 'step', step: 1, iteration: 0 },
      { phase: 'sequence', step: 2, iteration: 0 },
      { phase: 'step', step: 0, iteration: 1 },
      { phase: 'step', step: 1, iteration: 1 },
      { phase: 'animation', step: 2, iteration: 1 },
    ])
  })
})

describe('onAnimationEnd — payload shape', () => {
  it('includes target, value, finished, key on every call', () => {
    const withSpring = jest.spyOn(Reanimated, 'withSpring')
    const onEnd = jest.fn<void, [AnimationCallbackInfo<{ opacity: number }>]>()

    render(
      <Motion.View
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ type: 'spring' }}
        onAnimationEnd={onEnd}
      />,
    )

    settle(withSpring, 0)

    const info = onEnd.mock.calls[0]![0]
    expect(info.key).toBe('opacity')
    expect(info.finished).toBe(true)
    expect(info.target).toBe(1)
    // `value` reads sharedValue.value at fire time. The static mock writes
    // the resolved final value into the shared value; we just assert the
    // field is populated, not its exact contents.
    expect('value' in info).toBe(true)
  })
})

describe('onAnimationEnd — transform-parent coalescing', () => {
  it('coalesces translateX + translateY into a single transform-parent callback', () => {
    const withSpring = jest.spyOn(Reanimated, 'withSpring')
    const onEnd = jest.fn<
      void,
      [AnimationCallbackInfo<{ translateX: number }>]
    >()

    render(
      <Motion.View
        initial={{ translateX: 0, translateY: 0 }}
        animate={{ translateX: 100, translateY: 50 }}
        transition={{ type: 'spring' }}
        onAnimationEnd={onEnd}
      />,
    )

    // Two transform axes → two withSpring calls, two settle callbacks.
    expect(withSpring).toHaveBeenCalledTimes(2)
    settleAll(withSpring)

    // …but only one onAnimationEnd fire — the transform group coalesced.
    expect(onEnd).toHaveBeenCalledTimes(1)
    expect(onEnd).toHaveBeenCalledWith(
      expect.objectContaining({
        key: 'transform',
        phase: 'animation',
        finished: true,
      }),
    )
  })

  it('a single-axis transform animation also reports key="transform"', () => {
    const withSpring = jest.spyOn(Reanimated, 'withSpring')
    const onEnd = jest.fn<
      void,
      [AnimationCallbackInfo<{ translateX: number }>]
    >()

    render(
      <Motion.View
        initial={{ translateX: 0 }}
        animate={{ translateX: 100 }}
        transition={{ type: 'spring' }}
        onAnimationEnd={onEnd}
      />,
    )

    settleAll(withSpring)

    expect(onEnd).toHaveBeenCalledTimes(1)
    expect(onEnd).toHaveBeenCalledWith(
      expect.objectContaining({ key: 'transform', phase: 'animation' }),
    )
  })

  it('opacity + translateX produces two callbacks: opacity + transform', () => {
    const withSpring = jest.spyOn(Reanimated, 'withSpring')
    const onEnd = jest.fn<
      void,
      [AnimationCallbackInfo<{ opacity: number; translateX: number }>]
    >()

    render(
      <Motion.View
        initial={{ opacity: 0, translateX: 0 }}
        animate={{ opacity: 1, translateX: 100 }}
        transition={{ type: 'spring' }}
        onAnimationEnd={onEnd}
      />,
    )

    expect(withSpring).toHaveBeenCalledTimes(2)
    settleAll(withSpring)

    expect(onEnd).toHaveBeenCalledTimes(2)
    const keys = onEnd.mock.calls.map(([info]) => info.key).sort()
    expect(keys).toEqual(['opacity', 'transform'])
  })

  it('mid-step transform-axis callbacks still fire per-axis (only terminal coalesces)', () => {
    const withSpring = jest.spyOn(Reanimated, 'withSpring')
    const onEnd = jest.fn<
      void,
      [AnimationCallbackInfo<{ translateX: number }>]
    >()

    render(
      <Motion.View
        initial={{ translateX: 0 }}
        animate={{ translateX: [0, 50, 100] }}
        transition={{ type: 'spring' }}
        onAnimationEnd={onEnd}
      />,
    )

    settleAll(withSpring)

    // Step 0, step 1 fire as 'translateX' (mid-step events are per-axis).
    // Step 2 (terminal 'animation') is coalesced into 'transform'.
    expect(onEnd).toHaveBeenCalledTimes(3)
    const events = onEnd.mock.calls.map(([info]) => ({
      key: info.key,
      phase: info.phase,
      step: info.step,
    }))
    expect(events).toEqual([
      { key: 'translateX', phase: 'step', step: 0 },
      { key: 'translateX', phase: 'step', step: 1 },
      { key: 'transform', phase: 'animation', step: 2 },
    ])
  })
})
