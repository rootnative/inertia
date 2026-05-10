import { useSharedValue, type SharedValue } from 'react-native-reanimated'

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
export function useMotionValue<T extends number | string>(
  initial: T,
): SharedValue<T> {
  return useSharedValue<T>(initial)
}
