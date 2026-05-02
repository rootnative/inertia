import { Easing, withDelay, withSpring, withTiming } from 'react-native-reanimated'
import {
  type SpringTransition,
  type TimingTransition,
  type TransitionConfig,
} from '../types'

/**
 * Default spring physics, expressed in react-spring vocabulary. Conversion
 * to Reanimated's raw `stiffness`/`damping` lives below; raw config never
 * leaks past this module.
 */
const DEFAULT_SPRING: Required<
  Pick<SpringTransition, 'tension' | 'friction' | 'mass'>
> = {
  tension: 170,
  friction: 26,
  mass: 1,
}

function springToReanimated(t: SpringTransition) {
  return {
    stiffness: t.tension ?? DEFAULT_SPRING.tension,
    damping: t.friction ?? DEFAULT_SPRING.friction,
    mass: t.mass ?? DEFAULT_SPRING.mass,
    velocity: t.velocity,
    restSpeedThreshold: t.restSpeedThreshold,
    restDisplacementThreshold: t.restDisplacementThreshold,
  }
}

/**
 * Build a Reanimated animation for a single property. Runs on the JS thread
 * once per change and produces a baked `withSpring` / `withTiming` call. The
 * worklet body only consumes the result.
 *
 * Phase-1 scope: spring + timing + no-animation. `decay` is a phase-2
 * acceptance criterion and throws until then.
 */
export function resolveTransition(
  config: TransitionConfig | undefined,
  toValue: number | string,
): unknown {
  const cfg = config ?? ({ type: 'spring' } as SpringTransition)

  if (cfg.type === 'no-animation') return toValue

  if (cfg.type === 'decay') {
    throw new Error(
      '[inertia] type: "decay" lands in v0.1 phase 2 — not available in alpha.',
    )
  }

  const delay = cfg.delay ?? 0
  const animation =
    cfg.type === 'timing'
      ? buildTiming(cfg, toValue)
      : buildSpring(cfg as SpringTransition, toValue)

  return delay > 0 ? withDelay(delay, animation as never) : animation
}

function buildSpring(cfg: SpringTransition, toValue: number | string) {
  return withSpring(toValue as number, springToReanimated(cfg))
}

function buildTiming(cfg: TimingTransition, toValue: number | string) {
  return withTiming(toValue as number, {
    duration: cfg.duration ?? 250,
    easing: cfg.easing ?? Easing.inOut(Easing.ease),
  })
}
