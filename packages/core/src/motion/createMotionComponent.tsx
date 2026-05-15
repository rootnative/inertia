import {
  type ComponentType,
  forwardRef,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import Animated, {
  interpolateColor,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated'
import { useShouldReduceMotion } from '../config'
import { isFocusVisible } from '../gestures'
import { resolveLayoutTransition, type LayoutProp } from '../layout'
import { usePresence } from '../presence'
import {
  isTopLevelTransition,
  resolveAnimatableValue,
  resolveTransition,
  stableSig,
} from '../transitions'
import { ensureReanimatedInstalled } from './installCheck'
import {
  type AnimatableValue,
  type AnimateStyle,
  type AnimationCallbackInfo,
  type GestureLayerTransitions,
  type GestureSubStates,
  type MotionComponent,
  type MotionProps,
  type PerPropertyTransition,
  type Transition,
  type TransitionConfig,
  type VariantController,
  type VariantsMap,
} from '../types'

/**
 * Animatable properties supported in the alpha. Expanding this set is a
 * mechanical change — add the key here, decide whether it lives inside
 * `transform`, and wire it through `buildAnimatedStyle` below.
 */
const TRANSFORM_KEYS = [
  'translateX',
  'translateY',
  'scale',
  'scaleX',
  'scaleY',
  'rotate',
  'rotateX',
  'rotateY',
] as const

// Rotation keys land in the transform array as `{ rotate: '45deg' }` / `{
// rotateX: '45deg' }` etc. — Reanimated needs the unit-suffixed string form.
// We hold the underlying shared value as a plain number (degrees) and wrap
// in the worklet so the resolver pipeline stays uniform with the other
// numeric transform keys.
const ROTATION_KEYS = new Set<string>(['rotate', 'rotateX', 'rotateY'])

const NUMERIC_TOP_LEVEL_KEYS = [
  'opacity',
  'width',
  'height',
  'borderRadius',
] as const

// Color-valued keys. Reanimated's value setter detects color strings and
// interpolates between their packed RGBA representations natively in
// `withSpring` / `withTiming` — so the resolver path is identical to numeric
// keys; only the shared-value seed and the resting default differ.
//
// `tintColor` is Image-only, but allocated unconditionally here: the
// per-primitive type system (`AnimateStyle<C>`) is what gates which keys
// `animate` accepts at compile time. An unused shared value is a single ref;
// allocating it everywhere keeps hook order stable and the factory generic.
const COLOR_KEYS = [
  'backgroundColor',
  'borderColor',
  'color',
  'tintColor',
] as const

/**
 * Per-effect transform-group coordinator. Counts how many transform-axis
 * terminal callbacks are still pending; when the last one fires, the
 * factory emits a single coalesced `onAnimationEnd({ key: 'transform' })`
 * instead of N per-axis callbacks. Mutated by the dispatch closure.
 */
type TransformGroup = { remaining: number }

const ALL_KEYS = [
  ...TRANSFORM_KEYS,
  ...NUMERIC_TOP_LEVEL_KEYS,
  ...COLOR_KEYS,
] as const
type AnimatableKey = (typeof ALL_KEYS)[number]
type TransformKey = (typeof TRANSFORM_KEYS)[number]

const TRANSFORM_KEY_SET = new Set<AnimatableKey>(TRANSFORM_KEYS)
const COLOR_KEY_SET = new Set<AnimatableKey>(COLOR_KEYS)

const GESTURE_LAYER_NAMES = [
  'hovered',
  'focused',
  'focusVisible',
  'pressed',
] as const
type GestureLayerName = (typeof GESTURE_LAYER_NAMES)[number]
const GESTURE_LAYER_NAME_SET = new Set<string>(GESTURE_LAYER_NAMES)

// Stable style object applied while a Motion primitive is mid-exit so taps
// fall through. Hoisted so every render shares the same reference and
// Reanimated's style merging treats it as a no-op when present.
const EXITING_POINTER_EVENTS_STYLE = { pointerEvents: 'none' } as const

const DEFAULT_RESTING: Record<AnimatableKey, number | string> = {
  translateX: 0,
  translateY: 0,
  scale: 1,
  scaleX: 1,
  scaleY: 1,
  rotate: 0,
  rotateX: 0,
  rotateY: 0,
  opacity: 1,
  width: 0,
  height: 0,
  borderRadius: 0,
  // 'transparent' is the only safe universal default for colors: it works as
  // an initial seed for any color animation (no jarring opaque flash on mount
  // when `initial` is omitted) and rgba(0,0,0,0) interpolates cleanly into
  // any opaque target via Reanimated's color util.
  backgroundColor: 'transparent',
  borderColor: 'transparent',
  color: 'transparent',
  tintColor: 'transparent',
}

function transitionFor<S>(
  prop: keyof S,
  transition: Transition<S> | undefined,
): TransitionConfig | undefined {
  if (!transition) return undefined
  if (isTopLevelTransition(transition)) return transition
  // Gesture-layer keys (`pressed`, `hovered`, …) live on the same map as
  // per-property keys; skip them when looking up a property transition so a
  // user who wires `transition.pressed` doesn't accidentally apply that to a
  // style key named `pressed` (none currently exist, but keep the lookup
  // honest).
  if (GESTURE_LAYER_NAME_SET.has(prop as string)) return undefined
  return (transition as PerPropertyTransition<S>)[prop]
}

function gestureLayerTransitionFor<S>(
  layer: GestureLayerName,
  transition: Transition<S> | undefined,
): TransitionConfig | undefined {
  if (!transition) return undefined
  if (isTopLevelTransition(transition)) return transition
  return (transition as GestureLayerTransitions)[layer]
}

/**
 * Factory that wraps a React Native primitive as a `Motion.*` component.
 *
 * The generic `C` flows through `MotionProps`, so `animate` / `initial` /
 * `exit` / `transition` all infer from `C`'s `style` prop. There is no
 * shared `ViewStyle & TextStyle & ImageStyle` fallback.
 *
 * Alpha scope: numeric properties (transforms, opacity, width, height,
 * borderRadius) and color properties (backgroundColor, borderColor, color,
 * tintColor) applied via Reanimated shared values + `useAnimatedStyle`.
 */
// `ComponentType<any>` is React's canonical "accept any component" idiom.
// `unknown` doesn't work — props need to widen to whatever `C` actually accepts
// at the call site. The two `any` uses below are deliberate.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createMotionComponent<C extends ComponentType<any>>(
  Component: C,
): MotionComponent<C> {
  ensureReanimatedInstalled()

  const AnimatedComponent = Animated.createAnimatedComponent(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Component as ComponentType<any>,
  )

  type Props = React.ComponentProps<C> & MotionProps<React.ComponentProps<C>>

  const Motion = forwardRef<unknown, Props>(function Motion(props, ref) {
    const {
      initial,
      animate,
      exit,
      transition,
      variants,
      controller,
      gesture,
      layout,
      onAnimationEnd,
      style,
      ...rest
    } = props as Props & { style?: unknown; layout?: LayoutProp }

    // <Presence> contract: when an ancestor flips `isPresent` to false the
    // child stays rendered until `safeToRemove` is called, giving the exit
    // animation time to play. `null` when there is no <Presence> ancestor.
    const presence = usePresence()
    const isExiting = presence !== null && presence.isPresent === false

    // Resolved reduced-motion preference for this subtree. When true, every
    // per-key transition is replaced with `no-animation` below, so values
    // snap to target without interpolation. The hook also subscribes to OS
    // changes (via Reanimated's `useReducedMotion`), so toggling the
    // accessibility setting at runtime re-renders this component.
    const shouldReduceMotion = useShouldReduceMotion()

    // Pin the latest `onAnimationEnd` in a ref so the worklet callback always
    // dispatches against the current closure without re-resolving the
    // animation graph. Worklets can read refs via `runOnJS`.
    const onAnimationEndRef = useRef(onAnimationEnd)
    onAnimationEndRef.current = onAnimationEnd

    // Resolve `animate` against `variants` / `controller`. The controller's
    // `current` wins when both are set (typed contract: don't mix
    // `controller` and `animate` — controller drives the animation in that
    // mode). When `animate` is a string and `variants` exist, look it up.
    const variantKey = useControllerKey(controller)
    const resolvedAnimate = resolveAnimateInput(
      animate as AnimateStyle<unknown> | string | undefined,
      variants as VariantsMap<unknown> | undefined,
      variantKey,
    )

    const animateRecord = (resolvedAnimate ?? {}) as Partial<
      Record<AnimatableKey, AnimatableValue<number | string>>
    >
    const initialRecord =
      initial && initial !== false
        ? (initial as Partial<Record<AnimatableKey, number | string>>)
        : undefined
    const exitRecord = exit
      ? (exit as Partial<
          Record<AnimatableKey, AnimatableValue<number | string>>
        >)
      : undefined

    // Gesture sub-state activation tracked as JS state. Activation flips drive
    // the per-layer progress shared values (0↔1); they intentionally do NOT
    // re-run the value-driving effect — gesture sub-state targets live on the
    // worklet's composition chain, not on the base `animate` SV.
    const [pressed, setPressed] = useState(false)
    const [focused, setFocused] = useState(false)
    const [focusVisible, setFocusVisible] = useState(false)
    const [hovered, setHovered] = useState(false)

    // The set of keys this instance animates is locked at first render. With
    // variants in play the union across all variants is what matters — a key
    // touched by any variant must be active so the worklet picks it up when
    // the controller transitions. Gesture sub-states join the same union so
    // pressed/focused/focusVisible/hovered targets can drive any key they
    // declare even when the base `animate` doesn't touch it.
    const activeKeysRef = useRef<readonly AnimatableKey[] | null>(null)
    if (activeKeysRef.current === null) {
      const touched = new Set<AnimatableKey>()
      for (const k of ALL_KEYS) {
        if (k in animateRecord) touched.add(k)
        if (initialRecord && k in initialRecord) touched.add(k)
      }
      if (variants) {
        for (const variant of Object.values(variants) as object[]) {
          if (!variant) continue
          for (const k of ALL_KEYS) {
            if (k in variant) touched.add(k)
          }
        }
      }
      if (gesture) {
        for (const subState of [
          gesture.pressed,
          gesture.focused,
          gesture.focusVisible,
          gesture.hovered,
        ] as Array<object | undefined>) {
          if (!subState) continue
          for (const k of ALL_KEYS) {
            if (k in subState) touched.add(k)
          }
        }
      }
      if (exitRecord) {
        for (const k of ALL_KEYS) {
          if (k in exitRecord) touched.add(k)
        }
      }
      activeKeysRef.current = ALL_KEYS.filter((k) => touched.has(k))
    }
    const hasTransformRef = useRef<boolean>(
      activeKeysRef.current.some((k) => TRANSFORM_KEY_SET.has(k)),
    )

    const sharedValues = useAnimatableSharedValues((key) => {
      if (initial === false) {
        const a = animateRecord[key]
        return restValue(a) ?? DEFAULT_RESTING[key]
      }
      return (
        initialRecord?.[key] ??
        restValue(animateRecord[key]) ??
        DEFAULT_RESTING[key]
      )
    })

    // One progress SV per gesture layer, allocated unconditionally for hook
    // stability. Each layer's progress animates 0↔1 with its own transition
    // when its activation flips; the worklet reads them when compositing.
    // Initial value is 0 — even if a sub-state is somehow active on mount,
    // the activation effect below will animate it to 1 on the next tick.
    const pressedProgress = useSharedValue(0)
    const focusedProgress = useSharedValue(0)
    const focusVisibleProgress = useSharedValue(0)
    const hoveredProgress = useSharedValue(0)

    // Mirror gesture targets into a UI-runtime-resident shared value so the
    // animated-style worklet can read the latest layer values without having
    // to capture `gesture` directly (which would re-register the worklet on
    // every render where the consumer passes a fresh literal). The signature
    // dependency means we only push to the SV when targets actually change —
    // the SV ref itself is stable across renders.
    //
    // The resolved value is a layer-keyed map of primitive endpoints (numbers
    // or color strings); sequence/`{ to }` step shapes on a sub-state collapse
    // to their final endpoint via `targetEndValue` because a gesture layer
    // describes a steady target, not a keyframe sequence.
    const gestureSV = useSharedValue<ResolvedGestureLayers | null>(
      resolveGestureLayers(gesture),
    )
    const gestureTargetsSig = stableSig(gesture)
    useEffect(() => {
      gestureSV.value = resolveGestureLayers(gesture)
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [gestureTargetsSig])

    // The base record drives the per-key shared values. Gesture sub-state
    // targets are intentionally NOT merged here — they layer on top in the
    // worklet. Exit values still take precedence over `animate` while exiting
    // because the base SV is what <Presence> waits on to settle.
    const baseRecord =
      isExiting && exitRecord
        ? { ...animateRecord, ...exitRecord }
        : animateRecord
    const baseSig =
      stableSig(baseRecord) +
      (isExiting ? '|exit' : '') +
      (shouldReduceMotion ? '|rm' : '')
    const transitionSig = stableSig(transition)

    // Stable ref to the live `safeToRemove` so the effect's settle-counter
    // closure can reach the latest <Presence> binding without retriggering.
    const safeToRemoveRef = useRef<(() => void) | undefined>(undefined)
    safeToRemoveRef.current = presence?.safeToRemove

    useEffect(() => {
      // Exit fast-path: nothing to animate (or no exit prop), tell <Presence>
      // immediately so the unmount isn't gated on a phantom animation.
      if (isExiting && (!exitRecord || Object.keys(exitRecord).length === 0)) {
        safeToRemoveRef.current?.()
        return
      }

      let pending = 0
      let done = false
      const onSettle = () => {
        if (done) return
        pending--
        if (pending <= 0) {
          done = true
          if (isExiting) safeToRemoveRef.current?.()
        }
      }

      // Count transform axes participating in this effect run so the factory
      // can coalesce their terminal callbacks into a single transform-group
      // event. `undefined` when no transform axis is animating, which lets
      // the factory skip the coalescing branch entirely.
      let transformPending = 0
      for (const k of ALL_KEYS) {
        if (TRANSFORM_KEY_SET.has(k) && baseRecord[k] !== undefined) {
          transformPending++
        }
      }
      const transformGroup: TransformGroup | undefined =
        transformPending > 0 ? { remaining: transformPending } : undefined

      for (const key of ALL_KEYS) {
        const target = baseRecord[key]
        if (target === undefined) continue
        // Reduced-motion overrides every per-key transition (and any nested
        // sequence-step transition) with `no-animation`, which the resolver
        // turns into a direct value assignment. Sequences still iterate but
        // each step settles instantly, which matches the "snap to final
        // state" expectation.
        const cfg = shouldReduceMotion
          ? ({ type: 'no-animation' } as const)
          : transitionFor(key, transition)
        if (isExiting) pending++
        const factory = makeKeyCallbackFactory(
          key,
          sharedValues[key],
          targetEndValue(target),
          onAnimationEndRef,
          {
            stepCount: stepCountOf(target),
            totalIterations: totalIterationsOf(cfg),
          },
          isExiting ? onSettle : undefined,
          TRANSFORM_KEY_SET.has(key) ? transformGroup : undefined,
        )
        sharedValues[key].value = resolveAnimatableValue(
          target,
          cfg,
          factory,
        ) as never
      }

      // No exit-targeted keys (only `animate` keys present, no `exit`)
      // → release immediately rather than wait for animations that aren't
      // headed toward an exit value.
      if (isExiting && pending === 0) {
        safeToRemoveRef.current?.()
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [baseSig, transitionSig])

    // Per-layer progress: when a sub-state activation flips, animate its
    // progress SV 0↔1 with the layer's own transition (or the parent
    // transition / library default, in priority order). On exit we snap every
    // layer to 0 instantly so the unmount-bound base SV isn't fighting a
    // stale layer contribution mid-fade.
    //
    // The `declared` flag short-circuits the effect when the consumer hasn't
    // wired the corresponding sub-state — so a Motion primitive without a
    // `gesture` prop (or with only some sub-states declared) makes zero extra
    // `withSpring` / `withTiming` calls on mount.
    useGestureLayerProgress(
      pressedProgress,
      pressed,
      gesture?.pressed != null,
      'pressed',
      transition,
      isExiting,
      shouldReduceMotion,
    )
    useGestureLayerProgress(
      focusedProgress,
      focused,
      gesture?.focused != null,
      'focused',
      transition,
      isExiting,
      shouldReduceMotion,
    )
    useGestureLayerProgress(
      focusVisibleProgress,
      focusVisible,
      gesture?.focusVisible != null,
      'focusVisible',
      transition,
      isExiting,
      shouldReduceMotion,
    )
    useGestureLayerProgress(
      hoveredProgress,
      hovered,
      gesture?.hovered != null,
      'hovered',
      transition,
      isExiting,
      shouldReduceMotion,
    )

    const animatedStyle = useAnimatedStyle(() => {
      const activeKeys = activeKeysRef.current!
      const hasTransform = hasTransformRef.current
      const out: Record<string, unknown> = {}
      const transform: Array<Record<string, unknown>> = []

      // Read each progress SV exactly once so the chain below sees a coherent
      // snapshot for this frame. Reading them on the UI thread is cheap.
      const ph = hoveredProgress.value
      const pf = focusedProgress.value
      const pfv = focusVisibleProgress.value
      const pp = pressedProgress.value

      const layers = gestureSV.value
      // Locals are suffixed `Layer` so they don't shadow the outer `pressed` /
      // `focused` / `focusVisible` / `hovered` JS-state booleans — Reanimated's
      // worklet closure tracker would otherwise pick those up as captured
      // dependencies and re-register the worklet on every activation flip.
      const hoveredLayer = layers ? layers.hovered : null
      const focusedLayer = layers ? layers.focused : null
      const focusVisibleLayer = layers ? layers.focusVisible : null
      const pressedLayer = layers ? layers.pressed : null

      for (const key of activeKeys) {
        let v = sharedValues[key].value
        const isColor = COLOR_KEY_SET.has(key)

        // Composite gesture layers in priority order (lowest first). Each
        // active layer pulls the value toward its pre-resolved primitive
        // endpoint by `progress`; numeric keys lerp, color keys go through
        // Reanimated's RGBA `interpolateColor`. We skip layers with progress
        // 0 to avoid an `interpolateColor(0, ...)` call that would parse the
        // target color string for no visible effect.
        if (hoveredLayer && ph > 0 && hoveredLayer[key] !== undefined) {
          const t = hoveredLayer[key]
          v = isColor
            ? interpolateColor(ph, [0, 1], [v as string, t as string])
            : (v as number) + ((t as number) - (v as number)) * ph
        }
        if (focusedLayer && pf > 0 && focusedLayer[key] !== undefined) {
          const t = focusedLayer[key]
          v = isColor
            ? interpolateColor(pf, [0, 1], [v as string, t as string])
            : (v as number) + ((t as number) - (v as number)) * pf
        }
        if (
          focusVisibleLayer &&
          pfv > 0 &&
          focusVisibleLayer[key] !== undefined
        ) {
          const t = focusVisibleLayer[key]
          v = isColor
            ? interpolateColor(pfv, [0, 1], [v as string, t as string])
            : (v as number) + ((t as number) - (v as number)) * pfv
        }
        if (pressedLayer && pp > 0 && pressedLayer[key] !== undefined) {
          const t = pressedLayer[key]
          v = isColor
            ? interpolateColor(pp, [0, 1], [v as string, t as string])
            : (v as number) + ((t as number) - (v as number)) * pp
        }

        if (TRANSFORM_KEY_SET.has(key)) {
          transform.push(
            ROTATION_KEYS.has(key) ? { [key]: `${v}deg` } : { [key]: v },
          )
        } else {
          out[key] = v
        }
      }
      if (hasTransform) out.transform = transform
      return out
    })

    // Exiting children are tap-deaf: the next press should fall through to
    // whatever is underneath, not re-trigger a soon-to-unmount node. This is
    // the moti #297 fix and a v0.1 acceptance criterion. RN 0.71+ deprecates
    // `pointerEvents` as a prop in favor of the style key, so we merge it
    // alongside the animated style instead of spreading as a prop.
    const mergedStyle = useMemo(
      () =>
        (isExiting
          ? [style, animatedStyle, EXITING_POINTER_EVENTS_STYLE]
          : [style, animatedStyle]) as unknown,
      [style, animatedStyle, isExiting],
    )

    const gestureHandlers = useGestureHandlers(
      gesture,
      rest as Record<string, unknown>,
      setPressed,
      setFocused,
      setFocusVisible,
      setHovered,
    )

    // Resolve the `layout` prop into a Reanimated `LinearTransition` builder.
    // Memoized on the value's stable signature so a fresh `layout={true}` or
    // `layout={{ ... }}` literal each render doesn't rebuild the builder. When
    // reduced motion is active we pass `undefined` — see `resolveLayout` for
    // why we don't pass a duration-0 builder instead.
    const layoutSig = stableSig(layout)
    const layoutTransition = useMemo(
      () => (shouldReduceMotion ? undefined : resolveLayoutTransition(layout)),
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [layoutSig, shouldReduceMotion],
    )

    return (
      <AnimatedComponent
        ref={ref as never}
        {...(rest as object)}
        {...gestureHandlers}
        layout={layoutTransition}
        style={mergedStyle}
      />
    )
  })

  Motion.displayName = `Motion(${Component.displayName ?? Component.name ?? 'Component'})`

  return Motion as unknown as MotionComponent<C>
}

type SharedValueMap = Record<AnimatableKey, SharedValue<number | string>>

/**
 * Allocate one shared value per animatable key in `ALL_KEYS` and return a
 * **stable** map — same object reference across every render.
 *
 * Stability matters: `useAnimatedStyle` derives its dep array from
 * `Object.values(updater.__closure)`. Our worklet captures `sharedValues`,
 * so a fresh object literal each render would change that dep, fire
 * Reanimated's effect, and re-bind the worklet on the UI thread on every
 * render — the exact cost design principle 8 calls out. The shared values themselves
 * are stable across renders (Reanimated's `useSharedValue` is a `useRef`
 * under the hood), so snapshotting the wrapping object once is safe.
 *
 * Hooks are called in a stable, lexical order — fine for rules-of-hooks.
 * Unused shared values are cheap; the worklet skips them via
 * `activeKeysRef`. Color keys are seeded with the initial color string so
 * Reanimated's value setter recognizes the slot as a color from the first
 * `withSpring` / `withTiming` call.
 */
function useAnimatableSharedValues(
  init: (key: AnimatableKey) => number | string,
): SharedValueMap {
  const translateX = useSharedValue<number | string>(init('translateX'))
  const translateY = useSharedValue<number | string>(init('translateY'))
  const scale = useSharedValue<number | string>(init('scale'))
  const scaleX = useSharedValue<number | string>(init('scaleX'))
  const scaleY = useSharedValue<number | string>(init('scaleY'))
  const rotate = useSharedValue<number | string>(init('rotate'))
  const rotateX = useSharedValue<number | string>(init('rotateX'))
  const rotateY = useSharedValue<number | string>(init('rotateY'))
  const opacity = useSharedValue<number | string>(init('opacity'))
  const width = useSharedValue<number | string>(init('width'))
  const height = useSharedValue<number | string>(init('height'))
  const borderRadius = useSharedValue<number | string>(init('borderRadius'))
  const backgroundColor = useSharedValue<number | string>(
    init('backgroundColor'),
  )
  const borderColor = useSharedValue<number | string>(init('borderColor'))
  const color = useSharedValue<number | string>(init('color'))
  const tintColor = useSharedValue<number | string>(init('tintColor'))

  const ref = useRef<SharedValueMap | null>(null)
  if (ref.current === null) {
    ref.current = {
      translateX,
      translateY,
      scale,
      scaleX,
      scaleY,
      rotate,
      rotateX,
      rotateY,
      opacity,
      width,
      height,
      borderRadius,
      backgroundColor,
      borderColor,
      color,
      tintColor,
    }
  }
  return ref.current
}

/**
 * Build a per-key `CallbackFactory` for the resolver. Each step in a sequence
 * (or the single animation, when `value` isn't an array) gets its own
 * Reanimated callback; when it settles on the UI thread, the callback bridges
 * to JS via `runOnJS` and invokes the user's `onAnimationEnd` with a fully
 * populated `AnimationCallbackInfo`.
 *
 * Phase resolution lives here, on the JS thread. The resolver hands us a
 * coarse rawPhase (`'step'` for any sequence step, `'animation'` for a
 * single-shot terminal); we map that onto the public phase set
 * (`'step' | 'sequence' | 'repeat' | 'animation'`) using `meta` and the
 * iteration counter. `iteration` resets per effect run because the factory
 * is constructed fresh inside the effect.
 */
function makeKeyCallbackFactory(
  key: string,
  sharedValue: SharedValue<number | string>,
  target: number | string | undefined,
  onAnimationEndRef: {
    current: ((info: AnimationCallbackInfo<unknown>) => void) | undefined
  },
  meta: { stepCount: number; totalIterations: number },
  onSettle?: () => void,
  transformGroup?: TransformGroup,
) {
  if (!onAnimationEndRef.current && !onSettle) return undefined

  // Shared across this animation graph's callbacks (one per sequence step,
  // or one for a single-shot). Mutated when a full pass completes.
  const state = { iteration: 0 }

  const isTransformKey = TRANSFORM_KEY_SET.has(key as AnimatableKey)

  const dispatch = (
    rawPhase: 'step' | 'animation',
    step: number | undefined,
    finished: boolean,
    value: number | string | undefined,
  ) => {
    const isLastIteration = state.iteration >= meta.totalIterations - 1
    let phase: 'step' | 'sequence' | 'repeat' | 'animation'
    let isTerminal = false

    if (rawPhase === 'step') {
      const isLastInPass = step !== undefined && step === meta.stepCount - 1
      if (!isLastInPass) {
        phase = 'step'
      } else if (isLastIteration) {
        phase = 'animation'
        isTerminal = true
      } else {
        phase = 'sequence'
      }
    } else if (isLastIteration) {
      phase = 'animation'
      isTerminal = true
    } else {
      phase = 'repeat'
    }

    const reportedIteration = state.iteration
    if (phase === 'sequence' || phase === 'repeat') state.iteration++

    const fn = onAnimationEndRef.current
    if (fn) {
      // Transform-group coalescing: a multi-axis translate / scale /
      // rotate animation should fire onAnimationEnd ONCE for the logical
      // transform, not once per axis. We only coalesce the terminal
      // `'animation'` phase — `step`/`sequence`/`repeat` events fire
      // per-axis since each is its own logical event. Released per-axis
      // for a single-axis case too, with `key: 'transform'` for
      // consistency.
      if (isTransformKey && transformGroup && phase === 'animation') {
        transformGroup.remaining--
        if (transformGroup.remaining <= 0) {
          fn({
            key: 'transform' as never,
            finished,
            value,
            target,
            phase,
            step,
            iteration: reportedIteration,
          })
        }
      } else {
        fn({
          key: key as never,
          finished,
          value,
          target,
          phase,
          step,
          iteration: reportedIteration,
        })
      }
    }
    // Settle hooks fire per-axis on the terminal phase — <Presence> waits
    // for *every* exiting property to settle before unmounting, so we
    // intentionally do not coalesce these (the transform-group coalesce
    // is purely a user-callback ergonomic).
    if (onSettle && isTerminal) onSettle()
  }

  return (rawPhase: 'step' | 'animation', step: number | undefined) => {
    // Reanimated invokes the callback with only `finished` (see
    // valueSetter.js:24,40,51 in 4.x) — `current` is never passed. Read the
    // shared value inside the worklet; by the time the callback fires the
    // final/clamped value has already been written to it.
    const cb = (finished?: boolean) => {
      'worklet'
      runOnJS(dispatch)(rawPhase, step, !!finished, sharedValue.value)
    }
    return cb
  }
}

/**
 * Number of sequence steps in an animatable value. `1` for plain values and
 * single-step `{ to }` objects; the array length for keyframe arrays.
 */
function stepCountOf(v: AnimatableValue<number | string> | undefined): number {
  if (Array.isArray(v)) return v.length
  return 1
}

/**
 * Total number of iterations the animation will run, including the initial
 * pass. `1` when there is no `repeat`; `Number.POSITIVE_INFINITY` for
 * `'infinite'`. Decay and `no-animation` configs cannot repeat — both return
 * `1` so the iteration counter stays at 0.
 */
function totalIterationsOf(cfg: TransitionConfig | undefined): number {
  if (!cfg || cfg.type === 'no-animation' || cfg.type === 'decay') return 1
  const r = cfg.repeat
  if (r === undefined) return 1
  if (r === 'infinite') return Number.POSITIVE_INFINITY
  if (typeof r === 'number') return r
  if (r.count === 'infinite') return Number.POSITIVE_INFINITY
  return r.count
}

/**
 * Pull a single end-value out of an `AnimatableValue` for the
 * `AnimationCallbackInfo.target` field. Plain numbers/strings come through;
 * the last sequence step's `to`/value is used for arrays; `{ to }` step
 * objects use `to`. Returns `undefined` for unrecognized shapes.
 */
function targetEndValue(
  v: AnimatableValue<number | string> | undefined,
): number | string | undefined {
  if (v === undefined) return undefined
  if (typeof v === 'number' || typeof v === 'string') return v
  if (Array.isArray(v)) {
    return v.length > 0
      ? targetEndValue(v[v.length - 1] as AnimatableValue<number | string>)
      : undefined
  }
  if (typeof v === 'object' && v !== null && 'to' in v) {
    const to = (v as { to: unknown }).to
    return typeof to === 'number' || typeof to === 'string' ? to : undefined
  }
  return undefined
}

/**
 * Subscribe to a `VariantController` and return its `current` key. Returns
 * `undefined` when no controller is provided so callers can fall back to a
 * literal `animate` value.
 */
function useControllerKey(
  controller: VariantController | undefined,
): string | undefined {
  const [, setTick] = useState(0)
  useEffect(() => {
    if (!controller) return
    const unsub = controller.subscribe(() => setTick((n) => n + 1))
    return unsub
  }, [controller])
  return controller?.current
}

/**
 * Resolve the effective `animate` target from the public-prop tuple.
 *
 * Precedence: `controller.current` (when controller is set) > string-keyed
 * `animate` looked up in `variants` > literal `animate` object > `undefined`.
 */
function resolveAnimateInput(
  animate: AnimateStyle<unknown> | string | undefined,
  variants: VariantsMap<unknown> | undefined,
  controllerKey: string | undefined,
): AnimateStyle<unknown> | undefined {
  if (controllerKey !== undefined && variants && controllerKey in variants) {
    return variants[controllerKey]
  }
  if (typeof animate === 'string') {
    if (variants && animate in variants) return variants[animate]
    if (__DEV__) {
      console.warn(
        `[inertia] animate="${animate}" but no matching variant. Did you forget to pass \`variants\`?`,
      )
    }
    return undefined
  }
  return animate as AnimateStyle<unknown> | undefined
}

declare const __DEV__: boolean

/**
 * Pick the resting/initial-frame value out of an `AnimatableValue`. Plain
 * numbers and color strings come through unchanged; sequence arrays use their
 * first element; `{ to }` step objects use `to`. Unresolvable shapes return
 * `undefined` so the caller can fall back to `DEFAULT_RESTING`.
 */
function restValue(
  v: AnimatableValue<number | string> | undefined,
): number | string | undefined {
  if (v === undefined) return undefined
  if (typeof v === 'number' || typeof v === 'string') return v
  if (Array.isArray(v)) {
    return v.length > 0
      ? restValue(v[0] as AnimatableValue<number | string>)
      : undefined
  }
  if (typeof v === 'object' && v !== null && 'to' in v) {
    const to = (v as { to: unknown }).to
    return typeof to === 'number' || typeof to === 'string' ? to : undefined
  }
  return undefined
}

/**
 * Per-layer resolved targets: each declared gesture sub-state collapses to a
 * map of primitive endpoints (numbers or color strings), already passed
 * through `targetEndValue` so the worklet can use them directly without
 * inspecting `AnimatableValue` shapes on the UI thread.
 */
type ResolvedGestureLayers = {
  pressed?: Record<string, number | string>
  focused?: Record<string, number | string>
  focusVisible?: Record<string, number | string>
  hovered?: Record<string, number | string>
}

function resolveGestureLayers(
  gesture: GestureSubStates<unknown> | undefined,
): ResolvedGestureLayers | null {
  if (!gesture) return null
  const out: ResolvedGestureLayers = {}
  for (const layer of GESTURE_LAYER_NAMES) {
    const subState = gesture[layer]
    if (!subState) continue
    const resolved: Record<string, number | string> = {}
    for (const key of ALL_KEYS) {
      const raw = (subState as Record<string, unknown>)[key]
      if (raw === undefined) continue
      const t = targetEndValue(raw as AnimatableValue<number | string>)
      if (t !== undefined) resolved[key] = t
    }
    out[layer] = resolved
  }
  return out
}

/**
 * Drive a single gesture layer's progress shared value 0↔1 with its own
 * transition. Resolution priority for the layer config:
 * `transition.<layerName>` → top-level `transition` → library default spring.
 * On exit, snap to 0 instantly so the unmount-bound base SV finishes its exit
 * animation without a stale layer pulling the value off-target.
 *
 * The hook is invoked unconditionally (one call per layer) so hook order
 * stays stable even when `gesture` adds or removes sub-states across renders.
 */
function useGestureLayerProgress<S>(
  progress: SharedValue<number>,
  active: boolean,
  declared: boolean,
  layer: GestureLayerName,
  transition: Transition<S> | undefined,
  isExiting: boolean,
  shouldReduceMotion: boolean,
): void {
  const layerCfgSig = stableSig(gestureLayerTransitionFor(layer, transition))
  useEffect(() => {
    if (!declared) return
    if (isExiting) {
      progress.value = 0
      return
    }
    const target = active ? 1 : 0
    const cfg = shouldReduceMotion
      ? ({ type: 'no-animation' } as const)
      : (gestureLayerTransitionFor(layer, transition) ??
        ({ type: 'spring' } as const))
    progress.value = resolveTransition(cfg, target) as never
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, declared, isExiting, shouldReduceMotion, layerCfgSig])
}

type GestureHandlers = Record<string, (event: unknown) => void>

/**
 * Build the touch / focus / hover handler props for a gesture-enabled Motion
 * primitive. Returns an empty object when `gesture` is undefined so the
 * component renders identically to the gesture-less path (zero overhead).
 *
 * Existing user-supplied handlers on the same events are composed: the user's
 * handler runs first, then the internal state setter. We pull user handlers
 * out of `rest` rather than overwriting them.
 */
function useGestureHandlers(
  gesture: GestureSubStates<unknown> | undefined,
  rest: Record<string, unknown>,
  setPressed: (next: boolean) => void,
  setFocused: (next: boolean) => void,
  setFocusVisible: (next: boolean) => void,
  setHovered: (next: boolean) => void,
): GestureHandlers {
  // Deps key on declared-ness, not object identity — a fresh `gesture={...}`
  // literal each render must not rebuild handlers if the same sub-states are
  // declared.
  const hasPressed = gesture?.pressed ? 1 : 0
  const hasFocused = gesture?.focused ? 1 : 0
  const hasFocusVisible = gesture?.focusVisible ? 1 : 0
  const hasHovered = gesture?.hovered ? 1 : 0
  return useMemo(() => {
    if (!gesture) return {}
    const handlers: GestureHandlers = {}
    if (gesture.pressed) {
      handlers.onTouchStart = compose(rest.onTouchStart, () => setPressed(true))
      handlers.onTouchEnd = compose(rest.onTouchEnd, () => setPressed(false))
      handlers.onTouchCancel = compose(rest.onTouchCancel, () =>
        setPressed(false),
      )
      // Pressable / TouchableOpacity expose press hooks above the touch layer;
      // forward to those when present so wrapping consumers stay consistent.
      handlers.onPressIn = compose(rest.onPressIn, () => setPressed(true))
      handlers.onPressOut = compose(rest.onPressOut, () => setPressed(false))
    }
    // Mount onFocus/onBlur if either focus sub-state is declared. The two flags
    // are independent: `focused` always tracks focus; `focusVisible` only
    // engages when the most recent input was keyboard (W3C `:focus-visible`
    // semantics). On native the modality is always `'keyboard'`, so the two
    // flags move together.
    if (gesture.focused || gesture.focusVisible) {
      handlers.onFocus = compose(rest.onFocus, () => {
        if (gesture.focused) setFocused(true)
        if (gesture.focusVisible && isFocusVisible()) setFocusVisible(true)
      })
      handlers.onBlur = compose(rest.onBlur, () => {
        if (gesture.focused) setFocused(false)
        if (gesture.focusVisible) setFocusVisible(false)
      })
    }
    if (gesture.hovered) {
      // Web-only events. RN-Web 0.72+ accepts these on View; native ignores
      // them so the cost is zero on iOS / Android.
      handlers.onMouseEnter = compose(rest.onMouseEnter, () => setHovered(true))
      handlers.onMouseLeave = compose(rest.onMouseLeave, () =>
        setHovered(false),
      )
    }
    return handlers
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    hasPressed,
    hasFocused,
    hasFocusVisible,
    hasHovered,
    rest.onTouchStart,
    rest.onTouchEnd,
    rest.onTouchCancel,
    rest.onPressIn,
    rest.onPressOut,
    rest.onFocus,
    rest.onBlur,
    rest.onMouseEnter,
    rest.onMouseLeave,
  ])
}

function compose(
  user: unknown,
  ours: (event: unknown) => void,
): (event: unknown) => void {
  if (typeof user !== 'function') return ours
  return (event: unknown) => {
    ;(user as (event: unknown) => void)(event)
    ours(event)
  }
}

// Suppress the implicit any-return of the rotate ternary's union shape.
// `TransformKey` is exported only to keep the type readable in d.ts.
export type { TransformKey }
