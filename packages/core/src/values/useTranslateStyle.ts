import type { ViewStyle } from 'react-native'
import { useAnimatedStyle, type SharedValue } from 'react-native-reanimated'

/**
 * What {@link useTranslateStyle} returns: a plain style object that owns
 * `transform`.
 *
 * Deliberately **not** `ReturnType<typeof useAnimatedStyle>`. Reanimated 4.5
 * brands that value (`AnimatedStyleHandle`), and a branded type is rejected
 * inside a `StyleProp<ViewStyle>` array — so every call site would need a cast,
 * which is the exact defect `InterpolatedStyle` was introduced to remove in
 * `0.0.9`. The brand is compile-time only, so the runtime value is unchanged:
 * it is still the animated style Reanimated produced.
 */
export type TranslateStyle = {
  transform: NonNullable<ViewStyle['transform']>
}

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
): TranslateStyle {
  return useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }, { translateY: y.value }],
  })) as unknown as TranslateStyle
}
