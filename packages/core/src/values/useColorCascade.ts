import { useMemo } from 'react'
import {
  interpolateColor,
  useAnimatedStyle,
  type SharedValue,
} from 'react-native-reanimated'
import type { ColorStyleKey } from './useColorTransition'

/**
 * One layer in a color cascade: its own `progress` shared value (0→1) and the
 * color it blends toward as that progress rises. Layers are ordered lowest
 * priority first; a later layer wins over an earlier one at equal progress.
 */
export interface ColorCascadeLayer {
  /** 0→1 driver for this layer. Drive it upstream (spring / boolean / gesture). */
  progress: SharedValue<number>
  /** The color this layer blends toward as `progress` moves 0→1. */
  color: string
}

export interface UseColorCascadeOptions {
  /**
   * Which style slot the composited color is emitted under. Defaults to
   * `backgroundColor` — identical to `useColorTransition`. Override for ring
   * colors (`borderColor`), text (`color`), image tints (`tintColor`), etc.
   */
  key?: ColorStyleKey
}

/**
 * Priority-ordered layered color crossfade: each layer owns an independent
 * `progress` value and blends the accumulated color below it toward its own
 * color as that progress moves 0→1. Later layers win over earlier ones — the
 * array is priority order, **lowest first** (matching the `gesture` prop's
 * fixed-priority cascade, Decision 5).
 *
 * Equivalent to the hand-chained nested-`interpolateColor` shape
 * `focus(error(hover(rest)))`, collapsed into one hook and one worklet:
 *
 * ```tsx
 * const borderStyle = useColorCascade(
 *   colors.border,
 *   [
 *     { progress: hovered, color: colors.borderHover },
 *     { progress: errored, color: colors.borderError },
 *     { progress: focused, color: colors.borderFocus },
 *   ],
 *   { key: 'borderColor' },
 * )
 *
 * return <Motion.View style={[styles.field, borderStyle]} />
 * ```
 *
 * This is a pure interpolator — it does not animate on its own. Drive each
 * layer's `progress` upstream with a `useSpring`, `useBooleanSpring`, gesture
 * progress, or anything else producing a 0→1 shared value.
 *
 * For the single-layer case (`rest` ⇄ one active color), reach for
 * [`useColorTransition`](./useColorTransition) — it is the fast path and this
 * hook is not a replacement for it. For a mixed numeric + color cascade, or
 * function-valued layers, drop to a hand-rolled `useAnimatedStyle`.
 *
 * The layer chain is resolved once on the JS thread and memoized on a
 * structural signature (colors + key), so a fresh-but-equal `layers` array
 * each render produces no new UI-thread closure (CLAUDE.md principle 8). The
 * `progress` shared values are read live in the worklet, so their identity is
 * intentionally excluded from the signature.
 */
export function useColorCascade(
  rest: string,
  layers: readonly ColorCascadeLayer[],
  options?: UseColorCascadeOptions,
): ReturnType<typeof useAnimatedStyle> {
  const key = options?.key ?? 'backgroundColor'

  // Resolve the layer chain into two flat, memoized arrays the worklet closes
  // over — the static colors and the live progress shared values. Both are
  // memoized on the same structural signature so a fresh-but-equal `layers`
  // literal each render yields the same array references; Reanimated then sees
  // an unchanged closure dependency and does not rebuild the UI-thread worklet
  // (CLAUDE.md principle 8). The `progress` shared values are identity-stable
  // per hook instance, so signing the colors + count is enough to detect a
  // real change to the chain.
  const sig = `${key}|${rest}|${layers.length}|${layers
    .map((l) => l.color)
    .join(',')}`
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const colors = useMemo(() => layers.map((l) => l.color), [sig])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const progressValues = useMemo(() => layers.map((l) => l.progress), [sig])

  return useAnimatedStyle(() => {
    'worklet'
    // Fold the layers bottom-up: each layer blends the accumulated color below
    // it toward its own color as its progress rises, so a higher-priority
    // layer at full progress overrides everything beneath it.
    let acc = rest
    for (let i = 0; i < colors.length; i++) {
      acc = interpolateColor(
        progressValues[i]!.value,
        [0, 1],
        [acc, colors[i]!],
      )
    }
    return { [key]: acc }
  })
}
