import { useCallback, useMemo } from 'react'
import { useSharedValue, type SharedValue } from 'react-native-reanimated'
import {
  resolveNamedTransitionProp,
  useNamedTransitions,
  useShouldReduceMotion,
} from '../config'
import { isFocusVisible } from '../gestures'
import { isTopLevelTransition, resolveTransition } from '../transitions'
import {
  type GestureLayerTransitions,
  type TransitionConfig,
  type TransitionInput,
} from '../types'

type LayerName = 'pressed' | 'focused' | 'focusVisible' | 'hovered'

/**
 * Handler bag returned by `useGesture`. Spread on a `Pressable` to drive the
 * shared values returned alongside.
 *
 * Hover handlers use `Pressable`'s own `onHoverIn` / `onHoverOut` names (web
 * only — no-ops on native). `onFocus` consults `isFocusVisible()` before
 * raising the keyboard-only `focusVisible` layer; `focused` always raises.
 */
export interface UseGestureHandlers {
  onPressIn: () => void
  onPressOut: () => void
  onHoverIn: () => void
  onHoverOut: () => void
  onFocus: () => void
  onBlur: () => void
}

export interface UseGestureResult {
  /** 0↔1 progress for the pressed layer. */
  pressed: SharedValue<number>
  /** 0↔1 progress for the focused layer (any focus modality). */
  focused: SharedValue<number>
  /** 0↔1 progress for the focusVisible layer (keyboard focus only). */
  focusVisible: SharedValue<number>
  /** 0↔1 progress for the hovered layer (web only — stays at 0 on native). */
  hovered: SharedValue<number>
  /** Handlers to spread on the receiving `Pressable`. */
  handlers: UseGestureHandlers
}

/**
 * Build a gesture-layer controller. The hook-form of the `gesture` prop —
 * reach for it when you need to drive multiple animated views from the same
 * gesture state (a focus ring + state-layer halo + content tint all on one
 * Pressable), which the prop-form's "animate the receiver's own style" model
 * can't express.
 *
 * Returns four 0↔1 shared values (one per layer) and a handler bag to spread
 * on a `Pressable`. The shared values are stable across renders — feed them
 * into any number of `useAnimatedStyle` blocks anywhere in the tree.
 *
 * Transitions follow the same shape as the `gesture` prop's accompanying
 * `transition`: pass a single `TransitionConfig` to use for every layer, or a
 * `GestureLayerTransitions` map to give each layer its own. A `TransitionName`
 * registered on the nearest `<MotionConfig transitions>` is accepted in both
 * positions (top-level and per-layer). Layers without an explicit transition
 * fall back to the library default spring.
 *
 * Reduced motion (via `<MotionConfig reducedMotion>`) collapses every
 * transition to `no-animation` so state changes snap instead of interpolating
 * — same behaviour the gesture prop applies.
 *
 * @example
 * ```tsx
 * import { useAnimatedStyle } from 'react-native-reanimated'
 * import { useGesture } from '@rootnative/inertia'
 *
 * function Card() {
 *   const { pressed, focused, hovered, handlers } = useGesture({
 *     pressed: { type: 'timing', duration: 100 },
 *     hovered: { type: 'timing', duration: 150 },
 *     focused: { type: 'timing', duration: 200 },
 *   })
 *
 *   const ringStyle = useAnimatedStyle(() => ({ opacity: focused.value }))
 *   const haloStyle = useAnimatedStyle(() => ({
 *     opacity: Math.max(
 *       hovered.value * 0.08,
 *       focused.value * 0.10,
 *       pressed.value * 0.10,
 *     ),
 *   }))
 *
 *   return (
 *     <Pressable {...handlers}>
 *       <Animated.View style={ringStyle} />
 *       <Animated.View style={haloStyle} />
 *     </Pressable>
 *   )
 * }
 * ```
 */
export function useGesture(
  transition?: TransitionInput | GestureLayerTransitions,
): UseGestureResult {
  const pressed = useSharedValue(0)
  const focused = useSharedValue(0)
  const focusVisible = useSharedValue(0)
  const hovered = useSharedValue(0)
  const shouldReduceMotion = useShouldReduceMotion()
  // Registered transition names (top-level string or per-layer string values)
  // resolve against the nearest <MotionConfig transitions> at render time, so
  // the callbacks below only ever see concrete configs.
  const resolved = resolveNamedTransitionProp(transition, useNamedTransitions())

  const setLayer = useCallback(
    (sv: SharedValue<number>, layer: LayerName, target: 0 | 1) => {
      const cfg = shouldReduceMotion
        ? ({ type: 'no-animation' } as const)
        : (layerTransition(layer, resolved) ?? ({ type: 'spring' } as const))
      sv.value = resolveTransition(cfg, target) as never
    },
    // The transition is intentionally read on every call rather than cooked
    // into the dep array — a fresh literal each render would otherwise
    // rebuild the handler bag and break composing consumers that key off
    // handler identity. `transition` is read inside the callback closure;
    // shared values are stable so the only dep that matters is the reduce-
    // motion flag.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [shouldReduceMotion],
  )

  const handlers = useMemo<UseGestureHandlers>(
    () => ({
      onPressIn: () => setLayer(pressed, 'pressed', 1),
      onPressOut: () => setLayer(pressed, 'pressed', 0),
      onHoverIn: () => setLayer(hovered, 'hovered', 1),
      onHoverOut: () => setLayer(hovered, 'hovered', 0),
      onFocus: () => {
        setLayer(focused, 'focused', 1)
        if (isFocusVisible()) setLayer(focusVisible, 'focusVisible', 1)
      },
      onBlur: () => {
        setLayer(focused, 'focused', 0)
        setLayer(focusVisible, 'focusVisible', 0)
      },
    }),
    [setLayer, pressed, focused, focusVisible, hovered],
  )

  return { pressed, focused, focusVisible, hovered, handlers }
}

// Runs after name resolution, so the `TransitionInput` values on the map form
// are concrete configs by the time they're read — hence the return cast.
function layerTransition(
  layer: LayerName,
  transition: TransitionConfig | GestureLayerTransitions | undefined,
): TransitionConfig | undefined {
  if (!transition) return undefined
  if (isTopLevelTransition(transition)) return transition
  return (transition as GestureLayerTransitions)[layer] as
    | TransitionConfig
    | undefined
}
