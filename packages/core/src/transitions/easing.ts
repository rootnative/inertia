// `isWorkletFunction` lives in `react-native-worklets` (the Reanimated 4 peer
// dep); Reanimated's own re-export is deprecated.
import { isWorkletFunction } from 'react-native-worklets'
import { type EasingInput } from '../types'

/**
 * Reanimated 3.9+ validates that easing functions used in nested-transition
 * contexts (variants, sequences, per-property maps) are worklets, and crashes
 * with `[Reanimated] The easing function is not a worklet` otherwise. The
 * library accepts plain functions on the public surface; this helper wraps
 * them so consumers don't have to think about the worklet boundary.
 *
 * If the input is already a worklet (has been processed by the worklets babel
 * plugin), it's returned as-is. Otherwise it's wrapped in a function whose
 * body declares the `'worklet'` directive — when our source is processed by
 * the consumer's worklets babel plugin (the default Expo/RN setup), the
 * wrapper becomes a real worklet that captures the user fn via closure.
 *
 * Reanimated 4 changed `Easing.bezier(...)` to return an
 * `EasingFunctionFactory` (`{ factory: () => EasingFunction }`) rather than
 * the function itself. The helper accepts both shapes — `EasingFunction` and
 * `EasingFunctionFactory` — and unwraps the factory automatically so
 * consumers don't have to call `.factory()` manually.
 *
 * The user fn must be pure: no JS-thread captured refs, no shared mutable
 * state, no calls to non-worklet APIs.
 */
export function ensureWorkletEasing(
  easing: EasingInput | undefined,
): ((t: number) => number) | undefined {
  if (!easing) return undefined
  // Reanimated 4 `EasingFunctionFactory` — unwrap via `.factory()` before
  // checking worklet status, so the wrapped fn (not the factory wrapper)
  // ends up in the transition config.
  const fn = isEasingFactory(easing) ? easing.factory() : easing
  if (isWorkletFunction(fn)) return fn
  const wrapped = (t: number) => {
    'worklet'
    return fn(t)
  }
  return wrapped
}

function isEasingFactory(
  value: EasingInput,
): value is { factory: () => (t: number) => number } {
  return (
    typeof value === 'object' &&
    value !== null &&
    'factory' in value &&
    typeof (value as { factory: unknown }).factory === 'function'
  )
}
