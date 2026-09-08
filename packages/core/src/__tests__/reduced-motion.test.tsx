import { render, screen } from '@testing-library/react-native'
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

  // The gate held for the *transition* and not for the *shape*. Every step
  // resolved to a bare target, and `withSequence` writes a `finished` flag
  // onto each argument it is handed, so the array form threw
  // `Cannot create property 'finished' on number` from inside render and
  // blanked the entire page for anyone with reduce-motion on at the OS level.
  //
  // Jest cannot observe that throw. The Reanimated mock's `withSequence` is
  // `(...args) => args[args.length - 1]`, which takes primitives happily, and
  // its `withTiming` / `withSpring` return their target rather than an
  // animation object — so under the mock every step looks snapped whether the
  // gate is on or not. What IS observable, and is equivalent, is that a
  // sequence under the gate never reaches `withSequence` at all.
  describe('a snapped sequence never reaches withSequence', () => {
    it('does not build a sequence for a keyframe array', () => {
      const withSequence = jest.spyOn(Reanimated, 'withSequence')

      render(
        <MotionConfig reducedMotion="always">
          <Motion.View animate={{ translateY: [0, -8, 0], opacity: [0, 1] }} />
        </MotionConfig>,
      )

      expect(withSequence).not.toHaveBeenCalled()
    })

    it('settles the property on the last keyframe', () => {
      // Built fresh on both passes. `renderWithMotion` only clones the element
      // it is given, so with a `MotionConfig` on the outside the inner
      // `Motion.View` keeps its reference and React bails out of re-rendering
      // it — the flush never reaches the primitive whose style is under test.
      const tree = () => (
        <MotionConfig reducedMotion="always">
          <Motion.View testID="seq" animate={{ opacity: [0, 1, 0.25] }} />
        </MotionConfig>
      )
      const result = render(tree())
      result.rerender(tree())

      const raw = screen.getByTestId('seq').props.style
      const flat = Array.isArray(raw) ? raw.flat(Infinity) : [raw]
      const style = Object.assign({}, ...flat.filter(Boolean))
      expect(style.opacity).toBe(0.25)
    })

    // Positive control: without the gate the same tree must still build a
    // sequence, or the assertion above would pass for the wrong reason.
    it('still builds a sequence when reducedMotion="never"', () => {
      const withSequence = jest.spyOn(Reanimated, 'withSequence')

      render(
        <MotionConfig reducedMotion="never">
          <Motion.View animate={{ translateY: [0, -8, 0] }} />
        </MotionConfig>,
      )

      expect(withSequence).toHaveBeenCalled()
    })
  })
})
