import { useCallback } from 'react'
import { type SharedValue } from 'react-native-reanimated'
import {
  resolveNamedTransition,
  useNamedTransitions,
  useShouldReduceMotion,
} from '../config'
import { resolveTransition } from '../transitions'
import { type TransitionInput } from '../types'

/**
 * Imperative setter that drives a `SharedValue<number>` toward `to`, resolving
 * the transition through the **same context** the declarative surface uses. It
 * is the imperative escape hatch that closes the two footguns of writing
 * `value.value = resolveTransition(config, to)` by hand from an event handler:
 *
 * 1. **Named transitions resolve.** A `TransitionName` registered on the
 *    nearest `<MotionConfig transitions>` works here just as it does on the
 *    `transition` prop or in `useAnimation`. Raw `resolveTransition` can't
 *    reach the registry (names resolve via context), so imperative call sites
 *    otherwise rebuild configs the provider already owns.
 * 2. **Reduced motion is respected.** Writes route through the same
 *    `no-animation` downgrade `useAnimation` applies under
 *    `<MotionConfig reducedMotion>`. Hand-rolled `resolveTransition` writes
 *    silently bypass that setting — a correctness bug this hook fixes.
 *
 * The returned callback is stable across renders (it reads the registry and
 * the reduced-motion flag live inside the body), so it can be dropped straight
 * into memoized handlers.
 *
 * This is not a new animation API — it starts animations in Inertia's existing
 * transition vocabulary, so it does not conflict with the "no imperative-only
 * APIs that bypass the declarative surface" scope rule. It is the hooks-layer
 * equivalent of `useMotionValue` + `resolveTransition`, minus the footguns.
 *
 * @example
 * ```tsx
 * const hovered = useMotionValue(0)
 * const animate = useAnimator()
 *
 * const onHoverIn = () => animate(hovered, 1, 'state-hover')
 * const onHoverOut = () => animate(hovered, 0, 'state-hover')
 * ```
 *
 * @example
 * ```tsx
 * // Inline config works too; default is spring when omitted.
 * animate(progress, 1, { type: 'timing', duration: 150 })
 * animate(progress, 0) // spring
 * ```
 */
export type Animator = (
  value: SharedValue<number>,
  to: number,
  transition?: TransitionInput,
) => void

export function useAnimator(): Animator {
  const registry = useNamedTransitions()
  const shouldReduceMotion = useShouldReduceMotion()

  return useCallback(
    (value, to, transition) => {
      const resolved = resolveNamedTransition(transition, registry)
      const cfg = shouldReduceMotion
        ? ({ type: 'no-animation' } as const)
        : (resolved ?? ({ type: 'spring' } as const))
      value.value = resolveTransition(cfg, to) as never
    },
    [registry, shouldReduceMotion],
  )
}
