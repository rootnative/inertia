// `isWorkletFunction` lives in `react-native-worklets` (the Reanimated 4 peer
// dep); Reanimated's own re-export is deprecated.
import { isWorkletFunction } from 'react-native-worklets'
import { warnNonWorkletOnce } from '../internal/nonWorkletWarning'
import { type EasingInput } from '../types'

/**
 * Reanimated 3.9+ validates that easing functions used in nested-transition
 * contexts (variants, sequences, per-property maps) are worklets, and crashes
 * with `[Reanimated] The easing function is not a worklet` otherwise.
 *
 * Custom easing functions MUST therefore be worklets — put the `'worklet'`
 * directive as the function's first statement (Reanimated's built-in
 * `Easing.*` helpers and inertia's `cubicBezier()` already are). A plain
 * function warns in dev and falls back to a directive-wrapped call-through;
 * that wrapper works on web (single-threaded) but its closure holds the
 * opaque plain function, which native builds reject when the transition's
 * config is serialized to the UI thread.
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
  warnNonWorkletOnce(
    'timing-easing',
    "[inertia] timing easing: the provided easing function is not a worklet. The fallback wrapper works on web but native builds reject it when the transition runs on the UI thread. Add the 'worklet' directive as the first statement of the easing function, or use Reanimated's Easing.* helpers / inertia's cubicBezier(), which are already worklets.",
  )
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
