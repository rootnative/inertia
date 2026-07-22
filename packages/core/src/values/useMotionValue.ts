import { useEffect } from 'react'
import {
  cancelAnimation,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated'

/**
 * Create an animatable value owned by JS but readable from worklets.
 *
 * This is the escape-hatch primitive that the rest of the value-layer hooks
 * (`useSpring`, `useTransform`, `useScroll`) compose against. It is a thin
 * pass-through over Reanimated's `useSharedValue`: a `SharedValue<T>` with
 * `.value` for direct reads/writes (UI-thread reads in worklets, JS-thread
 * writes from event handlers / effects).
 *
 * We intentionally do not introduce a `MotionValue` wrapper class around the
 * shared value. The simplest object that interops with `useAnimatedStyle`,
 * `useDerivedValue`, and every other Reanimated API _is_ the shared value
 * itself; adding a `{ get, set, value }` shell would force consumers to
 * unwrap it at every Reanimated boundary and break worklet capture.
 *
 * Worklet read:
 * ```ts
 * const x = useMotionValue(0)
 * useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }))
 * ```
 *
 * JS write:
 * ```ts
 * onPress={() => { x.value = 100 }}
 * ```
 */
// Overloads widen primitive literals: with a bare generic constrained to
// `number | string`, TS skips literal widening, so `useMotionValue(0)` would
// infer `SharedValue<0>` and reject every subsequent write. The primitive
// overloads make `useMotionValue(0)` / `useMotionValue('#fff')` come back as
// `SharedValue<number>` / `SharedValue<string>`; the generic overload stays
// last for callers who want an explicit narrower type (e.g. a string union).
export function useMotionValue(initial: number): SharedValue<number>
export function useMotionValue(initial: string): SharedValue<string>
export function useMotionValue<T extends number | string>(
  initial: T,
): SharedValue<T>
export function useMotionValue<T extends number | string>(
  initial: T,
): SharedValue<T> {
  const sv = useSharedValue<T>(initial)
  // Cancel any in-flight animation when the owning component unmounts, so a
  // mid-flight (or infinite-repeat) `withX` driving this value stops ticking
  // its worklet once the value is orphaned. The shared value is
  // identity-stable per hook instance and owned by this component, so
  // cancelling on unmount is always safe. Mid-life cancellation stays the
  // consumer's job via the `/reanimated` interop `cancelAnimation`.
  useEffect(
    () => () => cancelAnimation(sv),
    // `sv` is identity-stable per hook instance (Reanimated guarantee).
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )
  return sv
}
