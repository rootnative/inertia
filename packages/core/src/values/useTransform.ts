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
import { warnNonWorkletOnce } from '../internal/nonWorkletWarning'

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
 * The transformer MUST be a worklet — put the `'worklet'` directive as its
 * first statement so the consumer's Babel plugin captures the shared values
 * it reads as its closure. It runs on the UI thread on every frame where
 * any read shared value changes.
 *
 * A plain function cannot work here, and the hook warns in dev when it gets
 * one: the best-effort wrapper it falls back to closes over the opaque
 * function reference, not the shared values read inside it, so Reanimated
 * can't track them as dependencies — the derived value only refreshes on
 * React re-renders, and native builds reject the plain function when the
 * closure crosses to the UI thread.
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
  // Build the producer worklet on the JS thread, then call
  // `useDerivedValue` exactly once. Keeping the hook call unconditional
  // satisfies rules-of-hooks; per-call branching (transformer vs
  // interpolation) is decided once at JS time, never at frame time.
  let producer: () => unknown
  if (typeof arg1 === 'function') {
    // Transformer overload. Must be a worklet — the directive-wrapped
    // fallback below is best-effort only (its closure holds the opaque
    // function, not the shared values read inside it, so dependency
    // tracking cannot work — see `warnNonWorkletOnce`).
    const userFn = arg1 as () => T
    if (isWorkletFunction(userFn)) {
      producer = userFn
    } else {
      warnNonWorkletOnce(
        'useTransform-transformer',
        "[inertia] useTransform: the transformer is not a worklet, so the shared values it reads can't be tracked as dependencies — the derived value will only refresh on React re-renders, and native builds reject plain functions on the UI thread. Add the 'worklet' directive as the first statement of the transformer.",
      )
      producer = () => {
        'worklet'
        return userFn()
      }
    }
  } else {
    // Interpolation overload. We pre-resolve everything JS-side so the
    // worklet body only consumes flat values.
    const source = arg1
    const input = inputRange as readonly number[]
    const output = outputRange as readonly (number | string)[]
    const isColor = output.length > 0 && typeof output[0] === 'string'
    const extrapolateLeft = mapExtrapolation(options?.extrapolateLeft)
    const extrapolateRight = mapExtrapolation(options?.extrapolateRight)
    producer = isColor
      ? () => {
          'worklet'
          return interpolateColor(
            source.value,
            input as number[],
            output as string[],
          )
        }
      : () => {
          'worklet'
          return interpolate(
            source.value,
            input as number[],
            output as number[],
            { extrapolateLeft, extrapolateRight },
          )
        }
  }

  return useDerivedValue(producer as () => never) as unknown as
    | SharedValue<T>
    | SharedValue<number>
    | SharedValue<string>
}

function mapExtrapolation(mode: ExtrapolationMode | undefined): Extrapolation {
  if (mode === 'identity') return Extrapolation.IDENTITY
  if (mode === 'extend') return Extrapolation.EXTEND
  return Extrapolation.CLAMP
}
