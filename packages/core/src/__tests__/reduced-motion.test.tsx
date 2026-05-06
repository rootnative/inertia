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
})
