import { render } from '@testing-library/react-native'
import * as Reanimated from 'react-native-reanimated'
import { Motion, MotionConfig } from '../index'

// Phase-3 acceptance: OS reduce-motion setting disables animations
// end-to-end. We test the strongest equivalent — `MotionConfig
// reducedMotion="always"` — which forces `useShouldReduceMotion()` to
// return true regardless of the OS setting. Every per-key transition
// should be swapped for `no-animation`, so none of the Reanimated
// timing/spring/decay primitives run.

describe('reduced motion — Phase-3 acceptance', () => {
  beforeEach(() => {
    jest.restoreAllMocks()
  })

  it('skips withSpring / withTiming / withDecay when reducedMotion="always"', () => {
    const withSpring = jest.spyOn(Reanimated, 'withSpring')
    const withTiming = jest.spyOn(Reanimated, 'withTiming')
    const withDecay = jest.spyOn(Reanimated, 'withDecay')

    render(
      <MotionConfig reducedMotion="always">
        <Motion.View
          testID="fade"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, scale: 1.5, translateX: 100 }}
          transition={{
            opacity: { type: 'timing', duration: 200 },
            scale: { type: 'spring', tension: 200 },
            translateX: { type: 'decay', velocity: 800 },
          }}
        />
      </MotionConfig>,
    )

    expect(withSpring).not.toHaveBeenCalled()
    expect(withTiming).not.toHaveBeenCalled()
    expect(withDecay).not.toHaveBeenCalled()
  })

  it('still animates when reducedMotion="never" (overrides OS)', () => {
    const withSpring = jest.spyOn(Reanimated, 'withSpring')

    render(
      <MotionConfig reducedMotion="never">
        <Motion.View
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ type: 'spring' }}
        />
      </MotionConfig>,
    )

    expect(withSpring).toHaveBeenCalled()
  })

  // A sequence step's inline transition is the one place the gate could be
  // talked out of. `configFor` swaps the *base* for `{ type: 'no-animation' }`,
  // but a step declares its own `type`, and `mergeTransition` lets a differing
  // step type win outright so a spring base can't leak fields into a timing
  // step. That rule must not apply to the reduced-motion base: the gate is not
  // a default to be overridden, it is a ceiling. The contract in
  // `createMotionComponent` says so explicitly ("overrides every per-key
  // transition and any nested sequence-step transition") — these assert it.
  describe('sequence steps cannot override the gate', () => {
    it('ignores a step-declared type under reducedMotion="always"', () => {
      const withSpring = jest.spyOn(Reanimated, 'withSpring')
      const withTiming = jest.spyOn(Reanimated, 'withTiming')
      const withDecay = jest.spyOn(Reanimated, 'withDecay')

      render(
        <MotionConfig reducedMotion="always">
          <Motion.View
            testID="seq"
            animate={{
              // Each step names a type that differs from the injected
              // `no-animation` base — the exact shape that bypassed the gate.
              translateX: [0, { to: 100, type: 'timing', duration: 0 }, 0],
              opacity: [0, { to: 1, type: 'spring', tension: 200 }, 0],
              scale: [1, { to: 2, type: 'decay', velocity: 800 }, 1],
            }}
          />
        </MotionConfig>,
      )

      expect(withTiming).not.toHaveBeenCalled()
      expect(withSpring).not.toHaveBeenCalled()
      expect(withDecay).not.toHaveBeenCalled()
    })

    it('ignores a step type on the single `{ to }` form too', () => {
      const withTiming = jest.spyOn(Reanimated, 'withTiming')

      render(
        <MotionConfig reducedMotion="always">
          <Motion.View
            animate={{ opacity: { to: 1, type: 'timing', duration: 300 } }}
          />
        </MotionConfig>,
      )

      expect(withTiming).not.toHaveBeenCalled()
    })

    // Positive control: the same tree must genuinely animate with the gate
    // off, or the two assertions above would pass for the wrong reason.
    it('honours step-declared types when reducedMotion="never"', () => {
      const withTiming = jest.spyOn(Reanimated, 'withTiming')

      render(
        <MotionConfig reducedMotion="never">
          <Motion.View
            animate={{
              translateX: [0, { to: 100, type: 'timing', duration: 120 }, 0],
            }}
          />
        </MotionConfig>,
      )

      expect(withTiming).toHaveBeenCalled()
    })
  })
})
