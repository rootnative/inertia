import {
  type ComponentType,
  forwardRef,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated'
import { usePresence } from '../presence'
import { resolveAnimatableValue } from '../transitions'
import {
  type AnimatableValue,
  type AnimateStyle,
  type AnimationCallbackInfo,
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
] as const

const TOP_LEVEL_KEYS = ['opacity', 'width', 'height', 'borderRadius'] as const

const ALL_KEYS = [...TRANSFORM_KEYS, ...TOP_LEVEL_KEYS] as const
type AnimatableKey = (typeof ALL_KEYS)[number]
type TransformKey = (typeof TRANSFORM_KEYS)[number]

const TRANSFORM_KEY_SET = new Set<AnimatableKey>(TRANSFORM_KEYS)

const DEFAULT_RESTING: Record<AnimatableKey, number> = {
  translateX: 0,
  translateY: 0,
  scale: 1,
  scaleX: 1,
  scaleY: 1,
  rotate: 0,
  opacity: 1,
  width: 0,
  height: 0,
  borderRadius: 0,
}

const TRANSITION_KEYS = new Set([
  'type',
  'tension',
  'friction',
  'mass',
  'velocity',
  'restSpeedThreshold',
  'restDisplacementThreshold',
  'duration',
  'easing',
  'delay',
  'repeat',
  'deceleration',
  'clamp',
])

function isTopLevelTransition(t: unknown): t is TransitionConfig {
  if (t === null || typeof t !== 'object') return false
  const keys = Object.keys(t as object)
  if (keys.length === 0) return false
  return keys.every((k) => TRANSITION_KEYS.has(k))
}

function transitionFor<S>(
  prop: keyof S,
  transition: Transition<S> | undefined,
): TransitionConfig | undefined {
  if (!transition) return undefined
  if (isTopLevelTransition(transition)) return transition
  return (transition as PerPropertyTransition<S>)[prop]
}

/**
 * Factory that wraps a React Native primitive as a `Motion.*` component.
 *
 * The generic `C` flows through `MotionProps`, so `animate` / `initial` /
 * `exit` / `transition` all infer from `C`'s `style` prop. There is no
 * shared `ViewStyle & TextStyle & ImageStyle` fallback.
 *
 * Alpha scope: numeric properties listed in `ALL_KEYS`, applied via
 * Reanimated shared values + `useAnimatedStyle`. Sequences, variants,
 * gestures, color animation, and the cross-render memoization optimization
 * land in later phases.
 */
export function createMotionComponent<C extends ComponentType<any>>(
  Component: C,
): MotionComponent<C> {
  const AnimatedComponent = Animated.createAnimatedComponent(
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
      onAnimationEnd,
      style,
      ...rest
    } = props as Props & { style?: unknown }

    // <Presence> contract: when an ancestor flips `isPresent` to false the
    // child stays rendered until `safeToRemove` is called, giving the exit
    // animation time to play. `null` when there is no <Presence> ancestor.
    const presence = usePresence()
    const isExiting = presence !== null && presence.isPresent === false

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
      Record<AnimatableKey, AnimatableValue<number>>
    >
    const initialRecord =
      initial && initial !== false
        ? (initial as Partial<Record<AnimatableKey, number>>)
        : undefined
    const exitRecord = exit
      ? (exit as Partial<Record<AnimatableKey, AnimatableValue<number>>>)
      : undefined

    // Gesture sub-state activation tracked as JS state so changes invalidate
    // the merged-target signature and re-run the animation effect. The cost
    // is three useState slots regardless of whether `gesture` is set; that's
    // tiny and lets us stay rules-of-hooks-clean.
    const [pressed, setPressed] = useState(false)
    const [focused, setFocused] = useState(false)
    const [hovered, setHovered] = useState(false)

    // The set of keys this instance animates is locked at first render. With
    // variants in play the union across all variants is what matters — a key
    // touched by any variant must be active so the worklet picks it up when
    // the controller transitions. Gesture sub-states join the same union so
    // pressed/focused/hovered targets can drive any key they declare.
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

    // Merge gesture sub-state targets over the base `animate` record. Keys
    // touched by any sub-state always appear in the merged record (falling
    // back to `animateRecord` or `DEFAULT_RESTING`) so releasing a gesture
    // animates back to a defined value rather than getting skipped.
    //
    // While exiting, exit values override everything — gesture / animate
    // targets are inert because the component is on its way out.
    const mergedRecord =
      isExiting && exitRecord
        ? { ...animateRecord, ...exitRecord }
        : mergeGestureTargets(animateRecord, gesture, {
            pressed,
            focused,
            hovered,
          })
    const mergedSig = stableSig(mergedRecord) + (isExiting ? '|exit' : '')
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

      for (const key of ALL_KEYS) {
        const target = mergedRecord[key]
        if (target === undefined) continue
        const cfg = transitionFor(key, transition)
        if (isExiting) pending++
        const factory = makeKeyCallbackFactory(
          key,
          sharedValues[key],
          targetEndValue(target),
          onAnimationEndRef,
          isExiting ? onSettle : undefined,
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
    }, [mergedSig, transitionSig])

    const animatedStyle = useAnimatedStyle(() => {
      const activeKeys = activeKeysRef.current!
      const hasTransform = hasTransformRef.current
      const out: Record<string, unknown> = {}
      const transform: Array<Record<string, unknown>> = []
      for (const key of activeKeys) {
        const v = sharedValues[key].value
        if (TRANSFORM_KEY_SET.has(key)) {
          transform.push(
            key === 'rotate' ? { rotate: `${v}deg` } : { [key]: v },
          )
        } else {
          out[key] = v
        }
      }
      if (hasTransform) out.transform = transform
      return out
    })

    const mergedStyle = useMemo(
      () => [style, animatedStyle] as unknown,
      [style, animatedStyle],
    )

    const gestureHandlers = useGestureHandlers(
      gesture,
      rest as Record<string, unknown>,
      setPressed,
      setFocused,
      setHovered,
    )

    // Exiting children are tap-deaf: the next press should fall through to
    // whatever is underneath, not re-trigger a soon-to-unmount node. This is
    // the moti #297 fix and a v0.1 acceptance criterion.
    const exitProps = isExiting ? { pointerEvents: 'none' as const } : undefined

    return (
      <AnimatedComponent
        ref={ref as never}
        {...(rest as object)}
        {...gestureHandlers}
        {...exitProps}
        style={mergedStyle}
      />
    )
  })

  Motion.displayName = `Motion(${Component.displayName ?? Component.name ?? 'Component'})`

  return Motion as unknown as MotionComponent<C>
}

type SharedValueMap = Record<AnimatableKey, SharedValue<number>>

/**
 * Allocate one shared value per animatable key in `ALL_KEYS`. Hooks are
 * called in a stable, lexical order — fine for rules-of-hooks. Unused
 * shared values are cheap; the worklet skips them via `activeKeysRef`.
 */
function useAnimatableSharedValues(
  init: (key: AnimatableKey) => number,
): SharedValueMap {
  return {
    translateX: useSharedValue(init('translateX')),
    translateY: useSharedValue(init('translateY')),
    scale: useSharedValue(init('scale')),
    scaleX: useSharedValue(init('scaleX')),
    scaleY: useSharedValue(init('scaleY')),
    rotate: useSharedValue(init('rotate')),
    opacity: useSharedValue(init('opacity')),
    width: useSharedValue(init('width')),
    height: useSharedValue(init('height')),
    borderRadius: useSharedValue(init('borderRadius')),
  }
}

/**
 * Build a per-key `CallbackFactory` for the resolver. Each step in a sequence
 * (or the single animation, when `value` isn't an array) gets its own
 * Reanimated callback; when it settles on the UI thread, the callback bridges
 * to JS via `runOnJS` and invokes the user's `onAnimationEnd` with a fully
 * populated `AnimationCallbackInfo`.
 *
 * Reading `onAnimationEndRef.current` inside the JS-side handler keeps the
 * factory itself stable — re-creating animations on every render is a
 * separate concern (gated by `animateSig` / `transitionSig`).
 */
function makeKeyCallbackFactory(
  key: string,
  sharedValue: SharedValue<number>,
  target: number | string | undefined,
  onAnimationEndRef: {
    current: ((info: AnimationCallbackInfo<unknown>) => void) | undefined
  },
  onSettle?: () => void,
) {
  if (!onAnimationEndRef.current && !onSettle) return undefined
  const dispatch = (
    phase: 'step' | 'animation',
    step: number | undefined,
    finished: boolean,
    value: number | string | undefined,
  ) => {
    const fn = onAnimationEndRef.current
    if (fn) {
      fn({
        key: key as never,
        finished,
        value,
        target,
        phase,
        step,
        iteration: 0,
      })
    }
    // Settle hooks fire only on the terminal phase of the property — sequence
    // mid-steps don't qualify, since <Presence> waits for the property to
    // reach its final exit value, not every keyframe.
    if (onSettle && phase === 'animation') onSettle()
  }
  return (phase: 'step' | 'animation', step: number | undefined) => {
    // Reanimated invokes the callback with only `finished` (see
    // valueSetter.js:24,40,51 in 4.x) — `current` is never passed. Read the
    // shared value inside the worklet; by the time the callback fires the
    // final/clamped value has already been written to it.
    const cb = (finished?: boolean) => {
      'worklet'
      runOnJS(dispatch)(phase, step, !!finished, sharedValue.value)
    }
    return cb
  }
}

/**
 * Pull a single end-value out of an `AnimatableValue` for the
 * `AnimationCallbackInfo.target` field. Plain numbers/strings come through;
 * the last sequence step's `to`/value is used for arrays; `{ to }` step
 * objects use `to`. Returns `undefined` for unrecognized shapes.
 */
function targetEndValue(
  v: AnimatableValue<number> | undefined,
): number | string | undefined {
  if (v === undefined) return undefined
  if (typeof v === 'number' || typeof v === 'string') return v
  if (Array.isArray(v)) {
    return v.length > 0
      ? targetEndValue(v[v.length - 1] as AnimatableValue<number>)
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
 * Pick the resting/initial-frame number out of an `AnimatableValue`. Plain
 * numbers come through unchanged; sequence arrays use their first element;
 * `{ to }` step objects use `to`. Non-numeric or unresolvable shapes return
 * `undefined` so the caller can fall back to `DEFAULT_RESTING`.
 */
function restValue(v: AnimatableValue<number> | undefined): number | undefined {
  if (v === undefined) return undefined
  if (typeof v === 'number') return v
  if (Array.isArray(v)) {
    return v.length > 0 ? restValue(v[0] as AnimatableValue<number>) : undefined
  }
  if (typeof v === 'object' && v !== null && 'to' in v) {
    const to = (v as { to: unknown }).to
    return typeof to === 'number' ? to : undefined
  }
  return undefined
}

function stableSig(value: unknown): string {
  if (value === undefined) return ''
  try {
    return stableStringify(value)
  } catch {
    return String(value)
  }
}

/**
 * JSON.stringify with keys sorted at every level — gives a stable signature
 * regardless of property declaration order. Functions serialize as `null` so a
 * change in easing-fn reference is invisible here; that's fine for v0.1
 * (easing swaps are rare and the worklet wrapper handles correctness).
 */
function stableStringify(v: unknown): string {
  if (v === null || typeof v !== 'object') {
    if (typeof v === 'function' || v === undefined) return 'null'
    return JSON.stringify(v)
  }
  if (Array.isArray(v)) {
    return '[' + v.map(stableStringify).join(',') + ']'
  }
  const obj = v as Record<string, unknown>
  const keys = Object.keys(obj).sort()
  return (
    '{' +
    keys
      .map((k) => JSON.stringify(k) + ':' + stableStringify(obj[k]))
      .join(',') +
    '}'
  )
}

/**
 * Merge gesture sub-state targets over the base `animate` record. Keys touched
 * by any declared sub-state are always present in the result so releasing a
 * gesture animates the property back to a defined value (the base `animate`
 * value when present, otherwise `DEFAULT_RESTING`). Sub-states layer in
 * priority order: `hovered` < `focused` < `pressed`.
 */
function mergeGestureTargets(
  base: Partial<Record<AnimatableKey, AnimatableValue<number>>>,
  gesture: GestureSubStates<unknown> | undefined,
  active: { pressed: boolean; focused: boolean; hovered: boolean },
): Partial<Record<AnimatableKey, AnimatableValue<number>>> {
  if (!gesture) return base
  const merged: Partial<Record<AnimatableKey, AnimatableValue<number>>> = {
    ...base,
  }
  const subStates = [
    gesture.hovered,
    gesture.focused,
    gesture.pressed,
  ] as Array<
    Partial<Record<AnimatableKey, AnimatableValue<number>>> | undefined
  >
  for (const sub of subStates) {
    if (!sub) continue
    for (const k of ALL_KEYS) {
      if (k in sub && !(k in merged)) {
        merged[k] = DEFAULT_RESTING[k]
      }
    }
  }
  if (active.hovered && gesture.hovered) {
    Object.assign(
      merged,
      gesture.hovered as Partial<
        Record<AnimatableKey, AnimatableValue<number>>
      >,
    )
  }
  if (active.focused && gesture.focused) {
    Object.assign(
      merged,
      gesture.focused as Partial<
        Record<AnimatableKey, AnimatableValue<number>>
      >,
    )
  }
  if (active.pressed && gesture.pressed) {
    Object.assign(
      merged,
      gesture.pressed as Partial<
        Record<AnimatableKey, AnimatableValue<number>>
      >,
    )
  }
  return merged
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
  setHovered: (next: boolean) => void,
): GestureHandlers {
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
    if (gesture.focused) {
      handlers.onFocus = compose(rest.onFocus, () => setFocused(true))
      handlers.onBlur = compose(rest.onBlur, () => setFocused(false))
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
    gesture?.pressed ? 1 : 0,
    gesture?.focused ? 1 : 0,
    gesture?.hovered ? 1 : 0,
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
