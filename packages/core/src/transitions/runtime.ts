import {
  Easing,
  withDecay,
  withSpring,
  withTiming,
} from 'react-native-reanimated'
import { springToReanimated } from './spring'
import { type TransitionConfig } from '../types'

const DEFAULT_TIMING_DURATION = 250

/**
 * Worklet-safe single-step animation builder. Mirrors a subset of
 * `resolveTransition` for the UI-thread path where the transition config is
 * picked at gesture-release time, not at render time.
 *
 * Supported: spring / timing / decay / no-animation, single-step only.
 * Not supported: sequences, top-level repeat, easing-function
 * auto-worklet-wrapping (pass an already-worklet easing if you need a custom
 * one — most release transitions don't).
 *
 * Use this from gesture worklets (`useDrag` / `usePan` release callbacks, or
 * any custom `Gesture.Pan().onEnd(() => ...)` worklet) to animate a shared
 * value with an Inertia transition without the JS round-trip that would lose
 * the release velocity.
 *
 * For decay transitions, `toValue` is ignored — decay decelerates from the
 * SV's current position via its own physics. Pass `0` if you don't have one.
 */
export function buildReleaseAnimation(
  transition: TransitionConfig,
  toValue: number,
): unknown {
  'worklet'
  if (transition.type === 'no-animation') return toValue
  if (transition.type === 'decay') {
    const cfg: {
      velocity: number
      deceleration?: number
      clamp?: [number, number]
    } = { velocity: transition.velocity ?? 0 }
    if (transition.deceleration !== undefined) {
      cfg.deceleration = transition.deceleration
    }
    if (transition.clamp !== undefined) cfg.clamp = transition.clamp
    return withDecay(cfg)
  }
  if (transition.type === 'timing') {
    // Reanimated 4's `Easing.bezier(...)` returns an `EasingFunctionFactory`
    // rather than the function itself. Unwrap inline so consumers calling
    // `buildReleaseAnimation` from a gesture worklet don't have to.
    const e = transition.easing
    const easingFn =
      e && typeof e === 'object' && 'factory' in e
        ? e.factory()
        : (e ?? Easing.inOut(Easing.ease))
    return withTiming(toValue, {
      duration: transition.duration ?? DEFAULT_TIMING_DURATION,
      easing: easingFn,
    })
  }
  return withSpring(toValue, springToReanimated(transition))
}
