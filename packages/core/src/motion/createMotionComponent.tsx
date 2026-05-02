import {
  type ComponentType,
  forwardRef,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated'
import { resolveAnimatableValue } from '../transitions'
import {
  type AnimatableValue,
  type AnimateStyle,
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
      exit: _exit,
      transition,
      variants,
      controller,
      onAnimationEnd: _onAnimationEnd,
      style,
      ...rest
    } = props as Props & { style?: unknown }

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

    // The set of keys this instance animates is locked at first render. With
    // variants in play the union across all variants is what matters — a key
    // touched by any variant must be active so the worklet picks it up when
    // the controller transitions.
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

    const animateSig = stableSig(animateRecord)
    const transitionSig = stableSig(transition)

    useEffect(() => {
      for (const key of ALL_KEYS) {
        const target = animateRecord[key]
        if (target === undefined) continue
        const cfg = transitionFor(key, transition)
        sharedValues[key].value = resolveAnimatableValue(target, cfg) as never
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [animateSig, transitionSig])

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

    return (
      <AnimatedComponent
        ref={ref as never}
        {...(rest as object)}
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
    return JSON.stringify(value, Object.keys(value as object).sort())
  } catch {
    return String(value)
  }
}

// Suppress the implicit any-return of the rotate ternary's union shape.
// `TransformKey` is exported only to keep the type readable in d.ts.
export type { TransformKey }
