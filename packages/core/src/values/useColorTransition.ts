import {
  interpolateColor,
  useAnimatedStyle,
  type SharedValue,
} from 'react-native-reanimated'

/**
 * Color style keys understood by React Native that this hook can target.
 * Sticks to the keys that exist on the v0.1 animatable surface so the
 * returned style fragment is always a legal RN style.
 */
export type ColorStyleKey =
  | 'backgroundColor'
  | 'color'
  | 'borderColor'
  | 'borderTopColor'
  | 'borderRightColor'
  | 'borderBottomColor'
  | 'borderLeftColor'
  | 'tintColor'
  | 'shadowColor'

export interface UseColorTransitionOptions {
  /**
   * Which style slot the interpolated color is emitted under. Defaults to
   * `backgroundColor` — the dominant case for state-layer haloes, card
   * fills, and chip surfaces. Override for ring colors (`borderColor`),
   * text colors (`color`), image tints (`tintColor`), etc.
   */
  key?: ColorStyleKey
}

/**
 * Interpolate a single color channel between `from` and `to` as `progress`
 * moves 0→1, returning an animated style fragment that can be spread onto
 * any Reanimated-aware view.
 *
 * ```tsx
 * const progress = useBooleanSpring(isPressed)
 * const fillStyle = useColorTransition(progress, [colors.surface, colors.pressed])
 * const ringStyle = useColorTransition(progress, [colors.outline, colors.primary], {
 *   key: 'borderColor',
 * })
 *
 * return <Motion.View style={[styles.chip, fillStyle, ringStyle]} />
 * ```
 *
 * This is a pure interpolator: it does not animate on its own. Drive
 * `progress` upstream with a `useSpring`, `useBooleanSpring`, gesture
 * progress, or scroll-derived `useTransform`. Values outside `[0, 1]`
 * clamp. For a raw `SharedValue<string>` (e.g. to feed a gradient or
 * compose into a hand-rolled `useAnimatedStyle`), use `useTransform`
 * directly with a color output range.
 */
export function useColorTransition(
  progress: SharedValue<number>,
  range: readonly [string, string],
  options?: UseColorTransitionOptions,
): ReturnType<typeof useAnimatedStyle> {
  // Resolve the slot key once on the JS thread so the worklet body
  // consumes a single string literal — consistent with the JS-thread
  // resolver principle that keeps `Object.keys`-style walks off the UI
  // thread (see CLAUDE.md design principle 8).
  const key = options?.key ?? 'backgroundColor'
  const from = range[0]
  const to = range[1]

  return useAnimatedStyle(() => {
    'worklet'
    return { [key]: interpolateColor(progress.value, [0, 1], [from, to]) }
  })
}
