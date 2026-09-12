import { useCallback, useEffect, useMemo } from 'react'
import { useSharedValue, type SharedValue } from 'react-native-reanimated'
import {
  resolveNamedTransitionProp,
  useNamedTransitions,
  useShouldReduceMotion,
} from '../config'
import { installFocusVisibility, isFocusVisible } from '../gestures'
import { isTopLevelTransition, resolveTransition } from '../transitions'
import {
  type GestureLayerTransitions,
  type TransitionConfig,
  type TransitionInput,
} from '../types'

type LayerName = 'pressed' | 'focused' | 'focusVisible' | 'hovered'

/**
 * Handler bag returned by `useGesture`, keyed for a `Pressable`.
 *
 * **Only use this on a surface that is genuinely interactive** — one with an
 * `onPress` and a role. Every value in it is a plain `() => void`; the names
 * are what couples it to `Pressable`, not the behaviour. For a surface that
 * merely reacts to the pointer, take {@link UseGestureResult.pointerHandlers}
 * instead and read the warning there.
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

/**
 * The same gesture callbacks keyed for a plain `View`, for a surface that
 * reacts to the pointer without being a control.
 *
 * `onPointerEnter` / `onPointerLeave` have been `ViewProps` since React
 * Native 0.71, and react-native-web forwards them to the DOM; `onFocus` /
 * `onBlur` are `ViewProps` too. So nothing here needs a `Pressable`, and
 * that matters more than it looks: **a `Pressable` is a tab stop even when
 * it does nothing.** Measured against react-native-web 0.21, a `Pressable`
 * with no `onPress` renders `tabindex="0"`, and it still does with
 * `accessible={false}` *and* `focusable={false}` — neither prop suppresses
 * it. A grid of five hover-lifting cards built that way adds five keyboard
 * stops that go nowhere, and the only way to see them is to read the built
 * HTML. A `View` carrying these handlers renders no `tabindex` at all.
 *
 * There is deliberately no press pair here. A surface with press feedback
 * should be a real control — give it a `Pressable`, an `onPress` and a role,
 * and use {@link UseGestureHandlers}.
 */
export interface UseGesturePointerHandlers {
  onPointerEnter: () => void
  onPointerLeave: () => void
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
  /**
   * Handlers keyed for a `Pressable`. Use these only when the surface is a
   * real control; see {@link UseGestureHandlers}.
   */
  handlers: UseGestureHandlers
  /**
   * The same callbacks keyed for a plain `View` — hover and focus, no press.
   * Prefer these for a non-interactive surface: a `Pressable` is a tab stop
   * even with no `onPress`. See {@link UseGesturePointerHandlers}.
   */
  pointerHandlers: UseGesturePointerHandlers
}

/**
 * Build a gesture-layer controller. The hook-form of the `gesture` prop —
 * reach for it when you need to drive multiple animated views from the same
 * gesture state (a focus ring + state-layer halo + content tint all on one
 * Pressable), which the prop-form's "animate the receiver's own style" model
 * can't express.
 *
 * Returns four 0↔1 shared values (one per layer) and **two** handler bags
 * carrying the same callbacks: `handlers`, keyed for a `Pressable`, and
 * `pointerHandlers`, keyed for a plain `View`. Pick by what the surface *is*,
 * not by what you are animating — a `Pressable` is a tab stop even with no
 * `onPress`, so a hover-only surface built on one ships a keyboard stop that
 * goes nowhere. The shared values are stable across renders — feed them into
 * any number of `useAnimatedStyle` blocks anywhere in the tree.
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
 *   // A real control: it has an onPress, so the tab stop is earned.
 *   return (
 *     <Pressable onPress={open} {...handlers}>
 *       <Animated.View style={ringStyle} />
 *       <Animated.View style={haloStyle} />
 *     </Pressable>
 *   )
 * }
 * ```
 *
 * A surface that only reacts to the pointer takes the other bag and no
 * `Pressable`, so it adds no keyboard stop:
 *
 * ```tsx
 * function HoverLift() {
 *   const { hovered, pointerHandlers } = useGesture()
 *   const liftStyle = useAnimatedStyle(() => ({
 *     transform: [{ translateY: -6 * hovered.value }],
 *   }))
 *
 *   return (
 *     <Animated.View style={liftStyle} {...pointerHandlers}>
 *       <Card />
 *     </Animated.View>
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

  // The web modality listeners behind `focusVisible` attach on mount — see
  // `focusVisibility.ts` for why mount time is early enough and import time
  // is not an option.
  useEffect(() => {
    installFocusVisibility()
  }, [])

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

  // Keyed for a `View`, sharing the same callbacks by reference so the two
  // bags stay in lockstep and a consumer can switch between them freely.
  const pointerHandlers = useMemo<UseGesturePointerHandlers>(
    () => ({
      onPointerEnter: handlers.onHoverIn,
      onPointerLeave: handlers.onHoverOut,
      onFocus: handlers.onFocus,
      onBlur: handlers.onBlur,
    }),
    [handlers],
  )

  return { pressed, focused, focusVisible, hovered, handlers, pointerHandlers }
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
