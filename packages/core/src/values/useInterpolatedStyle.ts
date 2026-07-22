import { useMemo } from 'react'
import {
  Extrapolation,
  interpolate,
  interpolateColor,
  useAnimatedStyle,
  type SharedValue,
} from 'react-native-reanimated'
import type { ColorStyleKey } from './useColorTransition'
import type { ExtrapolationMode } from './useTransform'

/**
 * Numeric style keys `useInterpolatedStyle` can emit directly (not lifted into
 * the transform array). Mirrors the flat numeric surface of the `animate`
 * prop.
 */
export type NumericStyleKey =
  | 'opacity'
  | 'width'
  | 'height'
  | 'borderRadius'
  | 'shadowOpacity'
  | 'shadowRadius'
  | 'elevation'
  | 'top'
  | 'left'
  | 'right'
  | 'bottom'
  | 'fontSize'
  | 'lineHeight'
  | 'letterSpacing'
  | 'borderWidth'

/**
 * Transform keys, lifted into a `transform: [...]` array in the order they
 * appear in the map — the same key-order convention the `animate` prop uses.
 * `rotate` / `rotateX` / `rotateY` take numeric degrees and emit
 * `'<n>deg'` strings.
 */
export type TransformKey =
  | 'translateX'
  | 'translateY'
  | 'scale'
  | 'scaleX'
  | 'scaleY'
  | 'rotate'
  | 'rotateX'
  | 'rotateY'

const TRANSFORM_KEYS = new Set<string>([
  'translateX',
  'translateY',
  'scale',
  'scaleX',
  'scaleY',
  'rotate',
  'rotateX',
  'rotateY',
])

const ROTATION_KEYS = new Set<string>(['rotate', 'rotateX', 'rotateY'])

const COLOR_KEYS = new Set<string>([
  'backgroundColor',
  'color',
  'borderColor',
  'borderTopColor',
  'borderRightColor',
  'borderBottomColor',
  'borderLeftColor',
  'tintColor',
  'shadowColor',
])

/**
 * Interpolation map: each entry maps `progress` onto an output range for one
 * style or transform key. Numeric / transform keys take number stops; color
 * keys take color-string stops. Mixing stop types per key is a compile error.
 */
export type InterpolatedStyleMap = {
  [K in NumericStyleKey | TransformKey]?: readonly number[]
} & {
  [K in ColorStyleKey]?: readonly string[]
}

export interface UseInterpolatedStyleOptions {
  /**
   * Input range mapped onto every key's output range. Defaults to `[0, 1]`
   * for 2-stop outputs, and to evenly-spaced stops across `[0, 1]` for
   * longer outputs. When provided, it applies to all keys; a key whose
   * output length differs from `inputRange.length` throws in dev.
   */
  inputRange?: readonly number[]
  /**
   * Edge behavior outside the input range. Defaults to `'clamp'`, matching
   * `useColorTransition`. Applies to numeric keys; color interpolation
   * always clamps (Reanimated's `interpolateColor` has no extrapolation
   * option).
   */
  extrapolate?: ExtrapolationMode
}

/** One key's pre-resolved plan; the worklet consumes these flat records. */
interface NumericEntry {
  kind: 'numeric'
  key: string
  input: number[]
  output: number[]
}
interface RotationEntry {
  kind: 'rotation'
  key: string
  input: number[]
  output: number[]
}
interface TransformNumericEntry {
  kind: 'transform-numeric'
  key: string
  input: number[]
  output: number[]
}
interface ColorEntry {
  kind: 'color'
  key: string
  input: number[]
  output: string[]
}
type Entry = NumericEntry | RotationEntry | TransformNumericEntry | ColorEntry

function evenlySpaced(count: number): number[] {
  if (count <= 1) return [0]
  const out: number[] = []
  for (let i = 0; i < count; i++) out.push(i / (count - 1))
  return out
}

function mapExtrapolation(mode: ExtrapolationMode | undefined): Extrapolation {
  if (mode === 'identity') return Extrapolation.IDENTITY
  if (mode === 'extend') return Extrapolation.EXTEND
  return Extrapolation.CLAMP
}

/**
 * Order-preserving structural signature of the map + options. Unlike
 * `stableSig` (which sorts keys), this walks `map` in insertion order because
 * transform lifting depends on it.
 */
function buildSignature(
  map: InterpolatedStyleMap,
  options: UseInterpolatedStyleOptions | undefined,
): string {
  let sig = ''
  for (const key of Object.keys(map)) {
    const output = (map as Record<string, readonly (number | string)[]>)[key]
    sig += `${key}:${JSON.stringify(output)}|`
  }
  sig += `#ir:${JSON.stringify(options?.inputRange)}|ex:${options?.extrapolate ?? ''}`
  return sig
}

/**
 * Resolve the map into flat per-key plans the worklet consumes. Walks `map`
 * in insertion order so transform axes emit in author order.
 */
function buildEntries(
  map: InterpolatedStyleMap,
  options: UseInterpolatedStyleOptions | undefined,
): Entry[] {
  const explicitInput = options?.inputRange
  const entries: Entry[] = []
  for (const key of Object.keys(map) as (keyof InterpolatedStyleMap)[]) {
    const output = map[key] as readonly (number | string)[] | undefined
    if (output === undefined || output.length === 0) continue

    const input = explicitInput
      ? (explicitInput as number[])
      : output.length === 2
        ? [0, 1]
        : evenlySpaced(output.length)

    if (__DEV__ && explicitInput && explicitInput.length !== output.length) {
      console.warn(
        `[inertia] useInterpolatedStyle: inputRange has ${explicitInput.length} stops but the "${String(
          key,
        )}" output has ${output.length}. They must match — interpolation results are undefined otherwise.`,
      )
    }

    const isColor =
      COLOR_KEYS.has(key as string) && typeof output[0] === 'string'
    if (isColor) {
      entries.push({
        kind: 'color',
        key: key as string,
        input,
        output: output as string[],
      })
    } else if (ROTATION_KEYS.has(key as string)) {
      entries.push({
        kind: 'rotation',
        key: key as string,
        input,
        output: output as number[],
      })
    } else if (TRANSFORM_KEYS.has(key as string)) {
      entries.push({
        kind: 'transform-numeric',
        key: key as string,
        input,
        output: output as number[],
      })
    } else {
      entries.push({
        kind: 'numeric',
        key: key as string,
        input,
        output: output as number[],
      })
    }
  }
  return entries
}

/**
 * Map one `progress` shared value onto N style props via `interpolate` /
 * `interpolateColor`, returning an animated style fragment that composes in a
 * style array on any Reanimated-aware host (`Motion.*`, a hand-rolled
 * `Animated.View`). The style-fragment counterpart to `useTransform`'s
 * output-range form, in the same family as `useColorTransition` / `useShadow`.
 *
 * ```tsx
 * const collapseStyle = useInterpolatedStyle(collapseProgress, {
 *   height: [expandedHeight, collapsedHeight],
 *   fontSize: [expanded.fontSize, collapsed.fontSize],
 * })
 *
 * const labelStyle = useInterpolatedStyle(floatProgress, {
 *   translateY: [restingOffset, 0],
 *   scale: [restingScale, 1],
 * })
 *
 * return <Motion.View style={[base, collapseStyle, labelStyle]} />
 * ```
 *
 * This is a pure interpolator — it does not animate on its own. Drive
 * `progress` upstream with a `useSpring`, `useBooleanSpring`, gesture
 * progress, or scroll-derived `useTransform`.
 *
 * - Numeric / transform keys route through `interpolate`; color-string stops
 *   on a color key route through `interpolateColor` (a multi-stop
 *   `useColorTransition` without touching that hook).
 * - Transform keys (`translateX`, `scale`, `rotate`, …) are lifted into a
 *   single `transform` array in the order they appear in the map. `rotate*`
 *   keys take numeric degrees and emit `'<n>deg'` strings, consistent with
 *   the `animate` surface.
 * - `options.inputRange` defaults to `[0, 1]` for 2-stop outputs and to
 *   evenly-spaced stops otherwise. `options.extrapolate` defaults to
 *   `'clamp'`.
 *
 * For function-valued entries or multi-source composition, drop to a
 * hand-rolled `useAnimatedStyle` (or `useTransform`'s worklet form) — this
 * hook stays fully declarative and hashable so unchanged maps produce zero
 * new UI-thread closures.
 */
export function useInterpolatedStyle(
  progress: SharedValue<number>,
  map: InterpolatedStyleMap,
  options?: UseInterpolatedStyleOptions,
): ReturnType<typeof useAnimatedStyle> {
  const extrapolate = mapExtrapolation(options?.extrapolate)

  // Order-preserving signature: the map's key order is load-bearing (transform
  // lifting emits axes in author order), so `stableSig` (which sorts keys) is
  // wrong here — sign the ordered key/output pairs plus the options directly.
  const sig = buildSignature(map, options)

  // Resolve every key's plan once on the JS thread so the worklet body only
  // consumes flat arrays — consistent with the JS-thread resolver principle
  // that keeps `Object.keys`-style walks off the UI thread (CLAUDE.md
  // principle 8). Memoized on `sig` so a fresh-but-equal map literal each
  // render yields the same `entries` reference — Reanimated then sees an
  // unchanged closure dependency and does not rebuild the UI-thread worklet.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const entries = useMemo<Entry[]>(() => buildEntries(map, options), [sig])

  return useAnimatedStyle(() => {
    'worklet'
    const out: Record<string, unknown> = {}
    const transform: Record<string, unknown>[] = []
    for (const e of entries) {
      if (e.kind === 'color') {
        out[e.key] = interpolateColor(progress.value, e.input, e.output)
      } else if (e.kind === 'numeric') {
        out[e.key] = interpolate(progress.value, e.input, e.output, {
          extrapolateLeft: extrapolate,
          extrapolateRight: extrapolate,
        })
      } else if (e.kind === 'transform-numeric') {
        transform.push({
          [e.key]: interpolate(progress.value, e.input, e.output, {
            extrapolateLeft: extrapolate,
            extrapolateRight: extrapolate,
          }),
        })
      } else {
        // rotation — emit a deg string
        const deg = interpolate(progress.value, e.input, e.output, {
          extrapolateLeft: extrapolate,
          extrapolateRight: extrapolate,
        })
        transform.push({ [e.key]: `${deg}deg` })
      }
    }
    if (transform.length > 0) out.transform = transform
    return out
  })
}

declare const __DEV__: boolean
