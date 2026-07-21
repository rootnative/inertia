import { LinearTransition } from 'react-native-reanimated'
import { ensureWorkletEasing } from '../transitions/easing'
import { DEFAULT_SPRING, springToReanimated } from '../transitions/spring'
import { type TransitionConfig } from '../types'

export type LayoutProp = boolean | TransitionConfig | undefined

/**
 * Resolve the public `layout` prop into a Reanimated `LinearTransition` builder.
 *
 * - `undefined` / `false` / `{ type: 'no-animation' }` → `undefined` (no layout
 *   animation; layout changes snap).
 * - `true` → default spring with the library's tuned tension / friction / mass.
 * - `{ type: 'spring', ... }` → spring with react-spring vocabulary, bridged
 *   into `springify().damping().stiffness().mass()` via `springToReanimated`.
 * - `{ type: 'timing', ... }` → `.duration().easing()`. Custom easing fns
 *   must be worklets (Reanimated 3.9+ validates this); plain functions
 *   dev-warn via `ensureWorkletEasing`.
 * - `{ type: 'decay', ... }` → silently downgrades to spring; decay doesn't
 *   have a clear target for a layout transition.
 *
 * When `reducedMotion` is true the caller should pass `undefined` so the
 * underlying component renders without a layout animation at all. We choose
 * this over `LinearTransition.duration(0)` because Reanimated still runs the
 * commit-tracking machinery in that case; the snap path is genuinely cheaper.
 */
export function resolveLayoutTransition(
  layout: LayoutProp,
): LinearTransition | undefined {
  if (!layout) return undefined

  const cfg: TransitionConfig = layout === true ? { type: 'spring' } : layout

  if (cfg.type === 'no-animation') return undefined

  if (cfg.type === 'timing') {
    let builder = LinearTransition.duration(cfg.duration ?? 300)
    const easing = ensureWorkletEasing(cfg.easing)
    if (easing) builder = builder.easing(easing)
    if (cfg.delay) builder = builder.delay(cfg.delay)
    return builder
  }

  const spring = cfg.type === 'decay' ? ({ type: 'spring' } as const) : cfg
  const { stiffness, damping, mass } = springToReanimated({
    ...DEFAULT_SPRING,
    ...spring,
  })
  let builder = LinearTransition.springify()
    .stiffness(stiffness)
    .damping(damping)
    .mass(mass)
  if ('delay' in spring && spring.delay) builder = builder.delay(spring.delay)
  return builder
}
