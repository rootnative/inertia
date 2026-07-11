import { useEffect, useMemo } from 'react'
import {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  type AnimatedStyle,
} from 'react-native-reanimated'
import {
  resolveNamedTransitionProp,
  useNamedTransitions,
  useShouldReduceMotion,
} from '../config'
import {
  isTopLevelTransition,
  resolveTransition,
  stableSig,
} from '../transitions'
import { useGesture, type UseGestureHandlers } from '../values/useGesture'
import {
  type GestureLayerTransitions,
  type TransitionConfig,
  type TransitionInput,
} from '../types'

/**
 * A single gesture-layer style — a flat map of style keys to a value. Numeric
 * values participate in clamped-max composition (the "strongest active layer
 * wins" model used by MD3 state-layer haloes); string values are treated as
 * colors and composed via priority cascade with `interpolateColor`.
 *
 * The hook does not validate that string values are valid colors — passing
 * something like `borderStyle: 'solid'` will crash inside the worklet. Keep
 * string values to color strings.
 */
export type GestureLayerStyle = {
  [key: string]: number | string | undefined
}

/**
 * Per-state style maps. Every key is optional; missing layers default to
 * `rest` (or `0` / `'transparent'` if `rest` is also absent for that key).
 *
 * - `rest` — base values, applied when no other layer is active.
 * - `hovered` / `focused` / `focusVisible` / `pressed` — gesture-driven
 *   states tracked via the underlying `useGesture` hook. Each owns an
 *   independent 0↔1 progress that fades the layer in/out per the configured
 *   transition.
 * - `disabled` — gated by the JS-side `options.disabled` flag rather than a
 *   gesture. Sits at the top of the priority cascade and overrides every
 *   gesture layer when active.
 */
export interface GestureLayerStates {
  rest?: GestureLayerStyle
  hovered?: GestureLayerStyle
  focused?: GestureLayerStyle
  focusVisible?: GestureLayerStyle
  pressed?: GestureLayerStyle
  disabled?: GestureLayerStyle
}

export interface UseGestureLayerOptions {
  /**
   * When `true`, the `disabled` layer becomes active (or `rest` if `disabled`
   * is undefined). Animates via the top-level transition or the library
   * default spring; per-layer transitions (`GestureLayerTransitions`) do not
   * apply to `disabled`.
   */
  disabled?: boolean
  /**
   * Transition forwarded to the underlying `useGesture` hook. Either a single
   * `TransitionConfig` for every gesture layer, or a `GestureLayerTransitions`
   * map for per-layer fades. A `TransitionName` registered on the nearest
   * `<MotionConfig transitions>` is accepted in both positions. Reduced
   * motion collapses every transition to `no-animation`.
   */
  transition?: TransitionInput | GestureLayerTransitions
}

export interface UseGestureLayerResult {
  /**
   * Animated style produced by `useAnimatedStyle` — spread on an
   * `Animated.View` or pass through `<Motion.View style={...} />`.
   */
  style: AnimatedStyle<Record<string, unknown>>
  /** Handlers to spread on the receiving `Pressable`. */
  handlers: UseGestureHandlers
}

/**
 * A "strongest active layer wins" interactive-feedback primitive. Sits one
 * step above `useGesture()` — the consumer supplies the per-state target
 * values, the hook handles the four gesture progress shared values, the
 * disabled override, the worklet, and the transition.
 *
 * Composition model:
 *
 * - **Numeric keys** (opacity, scale, borderWidth, etc.) compose via
 *   clamped-max with `rest` as the floor:
 *   `out = max(rest, ...for each active gesture layer: lerp(rest, layer, progress))`.
 *   This matches the MD3 state-layer halo pattern — multiple states active
 *   simultaneously raise the value to the strongest, not the sum.
 * - **Color keys** (any string value) compose via priority cascade with
 *   `interpolateColor`, lowest priority first: `hovered → focused →
 *   focusVisible → pressed`. Clamped-max doesn't apply to colors; this
 *   matches the cascade used by the declarative `gesture` prop.
 * - **Disabled** sits at the top of the cascade for both numeric and color
 *   keys — when active, it lerps the composed value toward the `disabled`
 *   target.
 *
 * Reach for this when you want MD3 / iOS-translucent state-layer overlays
 * without rewriting the worklet by hand for every consumer; reach for plain
 * `useGesture()` when you need a composition model this hook doesn't
 * express (additive, multiply, per-key custom blends).
 *
 * @example MD3 state-layer halo
 * ```tsx
 * import { useGestureLayer } from '@rootnative/inertia/gesture-layer'
 * import Animated from 'react-native-reanimated'
 * import { Pressable } from 'react-native'
 *
 * function SwitchHalo({ disabled }: { disabled?: boolean }) {
 *   const { style, handlers } = useGestureLayer(
 *     {
 *       rest: { opacity: 0, backgroundColor: 'transparent' },
 *       hovered: { opacity: 0.08, backgroundColor: '#000' },
 *       focused: { opacity: 0.10, backgroundColor: '#000' },
 *       pressed: { opacity: 0.12, backgroundColor: '#000' },
 *     },
 *     { disabled, transition: { type: 'timing', duration: 150 } },
 *   )
 *
 *   return (
 *     <Pressable {...handlers}>
 *       <Animated.View style={style} />
 *     </Pressable>
 *   )
 * }
 * ```
 */
export function useGestureLayer(
  states: GestureLayerStates,
  options: UseGestureLayerOptions = {},
): UseGestureLayerResult {
  const { disabled: isDisabled = false, transition: transitionInput } = options
  const shouldReduceMotion = useShouldReduceMotion()
  // Resolve registered names here (not just in useGesture) because the
  // `disabled` layer reads the top-level transition locally. Identity is
  // preserved when no names are present; when a name resolves, the effect
  // below keys on the structural signature so a per-render resolve of the
  // map form doesn't re-fire it.
  const transition = resolveNamedTransitionProp(
    transitionInput,
    useNamedTransitions(),
  )
  const gesture = useGesture(transition)
  const disabledProgress = useSharedValue(0)

  const transitionSig = stableSig(transition)
  useEffect(() => {
    const target = isDisabled ? 1 : 0
    const cfg = shouldReduceMotion
      ? ({ type: 'no-animation' } as const)
      : (disabledTransition(transition) ?? ({ type: 'spring' } as const))
    disabledProgress.value = resolveTransition(cfg, target) as never
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDisabled, shouldReduceMotion, transitionSig, disabledProgress])

  // JS-thread precompute: union of keys across all layers, per-key type
  // (number vs color), and a rest-fallback table. The worklet body reads
  // from `meta` instead of probing each layer per frame — the type check
  // only runs when layer identities change.
  const meta = useMemo(() => {
    const layers = {
      rest: states.rest,
      hovered: states.hovered,
      focused: states.focused,
      focusVisible: states.focusVisible,
      pressed: states.pressed,
      disabled: states.disabled,
    }
    const sources = [
      layers.rest,
      layers.hovered,
      layers.focused,
      layers.focusVisible,
      layers.pressed,
      layers.disabled,
    ]
    const keySet = new Set<string>()
    for (const src of sources) {
      if (!src) continue
      for (const k in src) if (src[k] !== undefined) keySet.add(k)
    }
    const keys = Array.from(keySet)
    const types: Record<string, 'number' | 'color'> = {}
    const restValues: Record<string, number | string> = {}
    for (const k of keys) {
      let firstDefined: number | string | undefined
      for (const src of sources) {
        if (src && src[k] !== undefined) {
          firstDefined = src[k]
          break
        }
      }
      const isColor = typeof firstDefined === 'string'
      types[k] = isColor ? 'color' : 'number'
      const restRaw = layers.rest ? layers.rest[k] : undefined
      restValues[k] =
        restRaw !== undefined ? restRaw : isColor ? 'transparent' : 0
    }
    return { layers, keys, types, restValues }
  }, [
    states.rest,
    states.hovered,
    states.focused,
    states.focusVisible,
    states.pressed,
    states.disabled,
  ])

  const style = useAnimatedStyle(() => {
    const { layers, keys, types, restValues } = meta
    const ph = gesture.hovered.value
    const pf = gesture.focused.value
    const pfv = gesture.focusVisible.value
    const pp = gesture.pressed.value
    const pd = disabledProgress.value

    const hoveredLayer = layers.hovered
    const focusedLayer = layers.focused
    const focusVisibleLayer = layers.focusVisible
    const pressedLayer = layers.pressed
    const disabledLayer = layers.disabled

    const out: Record<string, unknown> = {}

    for (let i = 0; i < keys.length; i++) {
      const k = keys[i]!
      const isColor = types[k] === 'color'
      const rest = restValues[k]!

      if (isColor) {
        let v = rest as string
        if (hoveredLayer && ph > 0 && hoveredLayer[k] !== undefined) {
          v = interpolateColor(ph, [0, 1], [v, hoveredLayer[k] as string])
        }
        if (focusedLayer && pf > 0 && focusedLayer[k] !== undefined) {
          v = interpolateColor(pf, [0, 1], [v, focusedLayer[k] as string])
        }
        if (
          focusVisibleLayer &&
          pfv > 0 &&
          focusVisibleLayer[k] !== undefined
        ) {
          v = interpolateColor(pfv, [0, 1], [v, focusVisibleLayer[k] as string])
        }
        if (pressedLayer && pp > 0 && pressedLayer[k] !== undefined) {
          v = interpolateColor(pp, [0, 1], [v, pressedLayer[k] as string])
        }
        if (disabledLayer && pd > 0 && disabledLayer[k] !== undefined) {
          v = interpolateColor(pd, [0, 1], [v, disabledLayer[k] as string])
        }
        out[k] = v
      } else {
        const base = rest as number
        let m = base
        if (hoveredLayer && ph > 0 && hoveredLayer[k] !== undefined) {
          const c = base + ((hoveredLayer[k] as number) - base) * ph
          if (c > m) m = c
        }
        if (focusedLayer && pf > 0 && focusedLayer[k] !== undefined) {
          const c = base + ((focusedLayer[k] as number) - base) * pf
          if (c > m) m = c
        }
        if (
          focusVisibleLayer &&
          pfv > 0 &&
          focusVisibleLayer[k] !== undefined
        ) {
          const c = base + ((focusVisibleLayer[k] as number) - base) * pfv
          if (c > m) m = c
        }
        if (pressedLayer && pp > 0 && pressedLayer[k] !== undefined) {
          const c = base + ((pressedLayer[k] as number) - base) * pp
          if (c > m) m = c
        }
        if (disabledLayer && pd > 0 && disabledLayer[k] !== undefined) {
          m = m + ((disabledLayer[k] as number) - m) * pd
        }
        out[k] = m
      }
    }

    return out
  })

  return {
    style: style as AnimatedStyle<Record<string, unknown>>,
    handlers: gesture.handlers,
  }
}

function disabledTransition(
  transition: TransitionConfig | GestureLayerTransitions | undefined,
): TransitionConfig | undefined {
  if (!transition) return undefined
  if (isTopLevelTransition(transition)) return transition
  return undefined
}
