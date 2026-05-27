import { type SharedValue } from 'react-native-reanimated'
import { useSpring } from './useSpring'
import { type SpringTransition } from '../types'

/**
 * Toggle a 0↔1 progress value with a spring whenever `active` flips.
 *
 * This is the recurring shape behind checkbox checks, accordion expansions,
 * drawer open/closed states, focus rings, and every other binary UI flip
 * that wants spring physics rather than a hard cut. The returned shared
 * value sits at `0` when `active` is `false` and animates toward `1` when
 * `active` flips to `true` (and back again on the reverse flip). Feed it to
 * a `useTransform`, `useShadow`, or a hand-rolled `useAnimatedStyle` to
 * drive whatever the boolean controls visually.
 *
 * ```tsx
 * const progress = useBooleanSpring(isChecked)
 * const indicatorStyle = useAnimatedStyle(() => ({
 *   opacity: progress.value,
 *   transform: [{ scale: progress.value }],
 * }))
 * ```
 *
 * The spring config follows the same react-spring vocabulary as the rest of
 * the library (`tension` / `friction` / `mass`); omit it to take the
 * library's defaults.
 */
export function useBooleanSpring(
  active: boolean,
  springConfig?: SpringTransition,
): SharedValue<number> {
  return useSpring(active ? 1 : 0, springConfig)
}
