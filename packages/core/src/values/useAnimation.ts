import { useEffect } from 'react'
import { useSharedValue, type SharedValue } from 'react-native-reanimated'
import { useShouldReduceMotion } from '../config'
import { resolveTransition, stableSig } from '../transitions'
import { type TransitionConfig } from '../types'

/**
 * Drive a `SharedValue<number>` toward `target` with **any** transition shape
 * — spring, timing, decay, or no-animation. The general-purpose value-layer
 * hook: reach for it when you need raw `useSharedValue + useEffect + withX`
 * outside the declarative `animate` flow.
 *
 * Re-runs whenever `target` changes shape (`target` is in the dep array) or
 * the transition signature changes (kept stable via JSON-style hashing).
 * Reduced motion (via `<MotionConfig reducedMotion>`) collapses the
 * transition to `no-animation` so the value snaps instead of interpolating.
 *
 * **Spring shorthand.** Prefer [`useSpring`](./useSpring) when you only want
 * spring physics — it accepts the same `tension`/`friction`/`mass` config and
 * also supports a `SharedValue<number>` as the target (UI-thread reactive
 * source). `useAnimation` is JS-thread-driven only.
 *
 * **Loops.** Repeat is part of `TransitionConfig` and flows through
 * untouched — `useAnimation(1, { type: 'timing', duration: 1800, repeat: {
 * count: 'infinite', alternate: false } })` produces an indeterminate-style
 * progress driver.
 *
 * @example
 * ```ts
 * // Toggle progress (Switch / Checkbox / Radio).
 * const progress = useAnimation(isChecked ? 1 : 0, {
 *   type: 'spring',
 *   tension: 380,
 *   friction: 33,
 * })
 *
 * // Float a TextField label when the value becomes non-empty.
 * const floated = useAnimation(hasValue ? 1 : 0, {
 *   type: 'timing',
 *   duration: 150,
 * })
 *
 * // Indeterminate progress slider (loops forever, snaps back).
 * const slide = useAnimation(1, {
 *   type: 'timing',
 *   duration: 1800,
 *   repeat: { count: 'infinite', alternate: false },
 * })
 * ```
 */
export function useAnimation(
  target: number,
  transition?: TransitionConfig,
): SharedValue<number> {
  const output = useSharedValue<number>(target)
  const shouldReduceMotion = useShouldReduceMotion()
  const cfgSig = stableSig(transition)

  useEffect(() => {
    const cfg = shouldReduceMotion
      ? ({ type: 'no-animation' } as const)
      : (transition ?? ({ type: 'spring' } as const))
    output.value = resolveTransition(cfg, target) as never
    // `output` is identity-stable per hook instance.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, cfgSig, shouldReduceMotion])

  return output
}
