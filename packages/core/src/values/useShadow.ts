import {
  interpolate,
  interpolateColor,
  useAnimatedStyle,
  type SharedValue,
} from 'react-native-reanimated'

/**
 * Shape accepted on either end of a `useShadow` tween. Every field is
 * optional — only keys present on at least one side participate in the
 * output style. Mirrors the flat shadow keys on `Motion.View`'s `animate`
 * surface, plus the nested `shadowOffset` source.
 */
export interface ShadowConfig {
  shadowOpacity?: number
  shadowRadius?: number
  shadowOffset?: { width?: number; height?: number }
  /** Android elevation. iOS shadow consumers can leave this off. */
  elevation?: number
  shadowColor?: string
}

export interface UseShadowOptions {
  /** Shadow state at `progress === 0`. */
  from: ShadowConfig
  /** Shadow state at `progress === 1`. */
  to: ShadowConfig
  /**
   * Driver — typically 0→1. Whatever produces it (a `useSpring`, a gesture
   * progress value, a scroll-derived `useTransform`) is the caller's
   * concern. The hook is a pure interpolator; it does not animate on its
   * own. Values outside `[0, 1]` clamp.
   */
  progress: SharedValue<number>
}

/**
 * Interpolate between two shadow configs as `progress` moves 0→1, returning
 * an animated style fragment that can be spread onto any Reanimated-aware
 * view (including `Motion.*` primitives and a hand-rolled `Animated.View`).
 *
 * ```tsx
 * const progress = useSpring(isElevated ? 1 : 0)
 * const shadowStyle = useShadow({
 *   from: { shadowOpacity: 0.08, shadowRadius: 2, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
 *   to:   { shadowOpacity: 0.24, shadowRadius: 12, shadowOffset: { width: 0, height: 8 }, elevation: 8 },
 *   progress,
 * })
 *
 * return <Motion.View style={[styles.card, shadowStyle]} />
 * ```
 *
 * Only keys present on either `from` or `to` are emitted. A key present on
 * one side and absent on the other tweens from the present value to the
 * absent side's natural zero (`0` for numbers, `'transparent'` for
 * `shadowColor`, `{ width: 0, height: 0 }` for `shadowOffset`). This is a
 * pure interpolator — to "animate" the shadow, drive `progress` with a
 * spring, timing, or gesture upstream.
 */
export function useShadow({
  from,
  to,
  progress,
}: UseShadowOptions): ReturnType<typeof useAnimatedStyle> {
  // Resolve presence + endpoints once on the JS thread so the worklet body
  // consumes flat literals — consistent with the JS-thread resolver
  // principle that keeps `Object.keys`-style walks off the UI thread.
  const hasOpacity =
    from.shadowOpacity !== undefined || to.shadowOpacity !== undefined
  const hasRadius =
    from.shadowRadius !== undefined || to.shadowRadius !== undefined
  const hasElevation =
    from.elevation !== undefined || to.elevation !== undefined
  const hasColor =
    from.shadowColor !== undefined || to.shadowColor !== undefined
  const hasOffset =
    from.shadowOffset !== undefined || to.shadowOffset !== undefined

  const opacityFrom = from.shadowOpacity ?? 0
  const opacityTo = to.shadowOpacity ?? 0
  const radiusFrom = from.shadowRadius ?? 0
  const radiusTo = to.shadowRadius ?? 0
  const elevationFrom = from.elevation ?? 0
  const elevationTo = to.elevation ?? 0
  const colorFrom = from.shadowColor ?? 'transparent'
  const colorTo = to.shadowColor ?? 'transparent'
  const offsetWFrom = from.shadowOffset?.width ?? 0
  const offsetWTo = to.shadowOffset?.width ?? 0
  const offsetHFrom = from.shadowOffset?.height ?? 0
  const offsetHTo = to.shadowOffset?.height ?? 0

  return useAnimatedStyle(() => {
    'worklet'
    const t = progress.value
    const out: Record<string, unknown> = {}
    if (hasOpacity) {
      out.shadowOpacity = interpolate(t, [0, 1], [opacityFrom, opacityTo])
    }
    if (hasRadius) {
      out.shadowRadius = interpolate(t, [0, 1], [radiusFrom, radiusTo])
    }
    if (hasElevation) {
      out.elevation = interpolate(t, [0, 1], [elevationFrom, elevationTo])
    }
    if (hasColor) {
      out.shadowColor = interpolateColor(t, [0, 1], [colorFrom, colorTo])
    }
    if (hasOffset) {
      out.shadowOffset = {
        width: interpolate(t, [0, 1], [offsetWFrom, offsetWTo]),
        height: interpolate(t, [0, 1], [offsetHFrom, offsetHTo]),
      }
    }
    return out
  })
}
