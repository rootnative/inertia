import {
  Extrapolation,
  interpolate,
  interpolateColor,
  useDerivedValue,
  type SharedValue,
} from 'react-native-reanimated'
// `isWorkletFunction` was re-exported from `react-native-reanimated` historically
// but is deprecated there in favor of importing from `react-native-worklets`.
// `react-native-worklets` is a required peer of Reanimated 4, so the direct
// import is always available wherever Inertia is.
import { isWorkletFunction } from 'react-native-worklets'

/**
 * Extrapolation behavior at the edges of the input range. Mirrors
 * Reanimated's enum so consumers don't need a separate import.
 *
 * - `'clamp'` (default) — output stays pinned at the first/last value
 *   outside the input range. Matches Framer Motion's default.
 * - `'identity'` — return the input unchanged outside the range.
 * - `'extend'` — continue the linear slope beyond the range.
 */
export type ExtrapolationMode = 'clamp' | 'identity' | 'extend'

export interface UseTransformOptions {
  extrapolateLeft?: ExtrapolationMode
  extrapolateRight?: ExtrapolationMode
}

/**
 * Derive a value from one or more shared values via a transformer worklet.
 *
 * ```ts
 * const x = useMotionValue(0)
 * const y = useMotionValue(0)
 * const distance = useTransform(() => Math.sqrt(x.value ** 2 + y.value ** 2))
 * ```
 *
 * The transformer must be a worklet (or a plain function we auto-wrap —
 * see the easing wrapper for the rationale). It runs on the UI thread on
 * every frame where any read shared value changes.
 */
export function useTransform<T>(transformer: () => T): SharedValue<T>

/**
 * Interpolate a numeric shared value onto a range of numbers or colors.
 *
 * ```ts
 * const scroll = useMotionValue(0)
 * const headerOpacity = useTransform(scroll, [0, 100], [1, 0])
 * const headerColor  = useTransform(scroll, [0, 100], ['#fff', '#000'])
 * ```
 *
 * When `outputRange` is numeric, this maps to Reanimated's `interpolate`;
 * when it's a tuple of color strings, it maps to `interpolateColor`. The
 * input range must be monotonically increasing.
 */
export function useTransform(
  value: SharedValue<number>,
  inputRange: readonly number[],
  outputRange: readonly number[],
  options?: UseTransformOptions,
): SharedValue<number>
export function useTransform(
  value: SharedValue<number>,
  inputRange: readonly number[],
  outputRange: readonly string[],
  options?: UseTransformOptions,
): SharedValue<string>

export function useTransform<T>(
  arg1: (() => T) | SharedValue<number>,
  inputRange?: readonly number[],
  outputRange?: readonly number[] | readonly string[],
  options?: UseTransformOptions,
): SharedValue<T> | SharedValue<number> | SharedValue<string> {
  // Single-arg transformer overload. We wrap non-worklet user fns the same
  // way `ensureWorkletEasing` does — the public surface accepts a plain
  // function; Reanimated 3.9+ requires worklets in nested-derivation
  // contexts, so we auto-wrap at JS time.
  if (typeof arg1 === 'function') {
    const userFn = arg1 as () => T
    const fn = isWorkletFunction(userFn)
      ? userFn
      : ((() => {
          'worklet'
          return userFn()
        }) as () => T)
    // `useDerivedValue` requires a worklet as the producer; the wrapped
    // function above carries the directive even when the user fn doesn't.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    return useDerivedValue<T>(fn) as SharedValue<T>
  }

  // Interpolation overload. We branch in a fresh `useDerivedValue` worklet
  // body — the branch lives at JS time (string vs number output) but the
  // chosen path runs on the UI thread.
  const source = arg1 as SharedValue<number>
  const input = inputRange as readonly number[]
  const output = outputRange as readonly (number | string)[]
  const isColor = output.length > 0 && typeof output[0] === 'string'

  const extrapolateLeft = mapExtrapolation(options?.extrapolateLeft)
  const extrapolateRight = mapExtrapolation(options?.extrapolateRight)

  return useDerivedValue(() => {
    'worklet'
    if (isColor) {
      return interpolateColor(
        source.value,
        input as number[],
        output as string[],
      ) as unknown as number | string
    }
    return interpolate(source.value, input as number[], output as number[], {
      extrapolateLeft,
      extrapolateRight,
    })
  }) as SharedValue<number> | SharedValue<string>
}

function mapExtrapolation(mode: ExtrapolationMode | undefined): Extrapolation {
  if (mode === 'identity') return Extrapolation.IDENTITY
  if (mode === 'extend') return Extrapolation.EXTEND
  return Extrapolation.CLAMP
}
