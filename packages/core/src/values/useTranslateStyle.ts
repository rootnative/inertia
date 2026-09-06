import { useAnimatedStyle, type SharedValue } from 'react-native-reanimated'

/**
 * Animated style that translates by two shared values:
 * `transform: [{ translateX: x }, { translateY: y }]`.
 *
 * This is the style fragment every drag-style hook returns (`useTouchDrag`,
 * and `useDrag` / `usePan` / `useSwipe` in `@rootnative/inertia-gestures`).
 * Use it directly when a custom gesture owns its own translation values.
 *
 * The style owns the whole `transform` key. Do not stack a second transform
 * style beside it — `transform` is one key in React Native, so the later
 * style replaces this one instead of merging. Nest another animated view, or
 * build one style from `x` / `y` with `useInterpolatedStyle`, to add a
 * transform.
 *
 * ```tsx
 * const x = useMotionValue(0)
 * const y = useMotionValue(0)
 * const style = useTranslateStyle(x, y)
 * return <Motion.View style={style} />
 * ```
 */
export function useTranslateStyle(
  x: SharedValue<number>,
  y: SharedValue<number>,
): ReturnType<typeof useAnimatedStyle> {
  return useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }, { translateY: y.value }],
  }))
}
