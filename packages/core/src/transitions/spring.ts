import { type SpringTransition } from '../types'

/**
 * Default spring physics, expressed in react-spring vocabulary.
 *
 * `tension: 170` / `friction: 26` / `mass: 1` was picked over Reanimated's
 * raw `stiffness: 100` / `damping: 10` default because the raw default
 * overshoots noticeably for the small (~100px) translates that dominate
 * UI work — buttons, sheets, popovers. These numbers settle in ~350ms with
 * a single, almost-imperceptible overshoot, which matches the perceptual
 * target the rest of the library is tuned against.
 */
export const DEFAULT_SPRING: Required<
  Pick<SpringTransition, 'tension' | 'friction' | 'mass'>
> = {
  tension: 170,
  friction: 26,
  mass: 1,
}

/**
 * Convert public react-spring vocabulary (`tension` / `friction` / `mass`)
 * to Reanimated's raw `stiffness` / `damping` / `mass`. This is the single
 * place the mapping lives; resolvers, value hooks, and any future surface
 * that needs a Reanimated spring config import from here.
 *
 * The mapping is identity (tension ≡ stiffness, friction ≡ damping) — the
 * names differ but the underlying physics constants are the same. We don't
 * surface the raw names publicly because the react-spring vocabulary is
 * what designers and prior-art consumers expect.
 */
export function springToReanimated(t: SpringTransition) {
  'worklet'
  return {
    stiffness: t.tension ?? DEFAULT_SPRING.tension,
    damping: t.friction ?? DEFAULT_SPRING.friction,
    mass: t.mass ?? DEFAULT_SPRING.mass,
    velocity: t.velocity,
    restSpeedThreshold: t.restSpeedThreshold,
    restDisplacementThreshold: t.restDisplacementThreshold,
  }
}
