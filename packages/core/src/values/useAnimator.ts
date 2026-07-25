import { useCallback, useRef } from 'react'
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
 * The returned callback is identity-stable for the lifetime of the component —
 * it reads the registry and the reduced-motion flag out of refs at call time,
 * so neither a new `<MotionConfig transitions>` map nor a reduced-motion change
 * gives it a new identity. Drop it straight into memoized handlers or a
 * `useCallback` dependency list without churning them.
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

  // Latest context values behind refs, so the callback below can close over
  // nothing that changes. Depending on them directly would hand back a new
  // identity whenever a provider re-published its registry or the OS
  // reduced-motion flag flipped — which breaks the documented contract that
  // this is safe to drop into a memoized handler. Reading at call time is also
  // strictly more correct: the write always resolves against the registry that
  // is current *when the event fires*, not the one captured at render.
  const registryRef = useRef(registry)
  registryRef.current = registry
  const reduceMotionRef = useRef(shouldReduceMotion)
  reduceMotionRef.current = shouldReduceMotion

  return useCallback((value, to, transition) => {
    const resolved = resolveNamedTransition(transition, registryRef.current)
    const cfg = reduceMotionRef.current
      ? ({ type: 'no-animation' } as const)
      : (resolved ?? ({ type: 'spring' } as const))
    value.value = resolveTransition(cfg, to) as never
  }, [])
}
