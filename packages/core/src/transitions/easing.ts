import { isWorkletFunction } from 'react-native-reanimated'

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
 * The user fn must be pure: no JS-thread captured refs, no shared mutable
 * state, no calls to non-worklet APIs.
 */
export function ensureWorkletEasing(
  easing: ((t: number) => number) | undefined,
): ((t: number) => number) | undefined {
  if (!easing) return undefined
  if (isWorkletFunction(easing)) return easing
  const wrapped = (t: number) => {
    'worklet'
    return easing(t)
  }
  return wrapped
}
