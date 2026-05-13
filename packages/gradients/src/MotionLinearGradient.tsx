import { useEffect, useRef } from 'react'
import { LinearGradient, type LinearGradientProps } from 'expo-linear-gradient'
import Animated, {
  useAnimatedProps,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated'
import {
  resolveTransition,
  useShouldReduceMotion,
  type TransitionConfig,
} from '@onlynative/inertia'
import type {
  GradientPoint,
  LinearGradientAnimate,
  LinearGradientPerPropertyTransition,
  LinearGradientTransition,
} from './types'

const AnimatedLinearGradient = Animated.createAnimatedComponent(LinearGradient)

const NO_ANIMATION: TransitionConfig = { type: 'no-animation' }
const DEFAULT_START: GradientPoint = { x: 0, y: 0 }
const DEFAULT_END: GradientPoint = { x: 1, y: 0 }

/**
 * Extract the per-key transition for `key`, falling back to the top-level
 * transition if the user passed `transition` as a single `TransitionConfig`
 * rather than a per-property map. Mirrors the precedence rule used by the
 * core factory: per-key wins, top-level fills, library default below that.
 */
function pickTransition(
  per: LinearGradientTransition | undefined,
  key: keyof LinearGradientPerPropertyTransition,
): TransitionConfig | undefined {
  if (!per) return undefined
  if ('type' in per) return per as TransitionConfig
  return (per as LinearGradientPerPropertyTransition)[key]
}

type AtLeastTwoStrings = readonly [string, string, ...string[]]

export interface MotionLinearGradientProps extends Omit<
  LinearGradientProps,
  'colors' | 'start' | 'end' | 'locations'
> {
  /**
   * Initial color stops, in order. At least two are required. The array's
   * length is **locked at first render** — to change the number of stops,
   * remount with a new `key`.
   */
  colors: AtLeastTwoStrings
  /** Start point in normalized `[0, 1]` coordinates. Defaults to `{x:0,y:0}`. */
  start?: GradientPoint
  /** End point in normalized `[0, 1]` coordinates. Defaults to `{x:1,y:0}`. */
  end?: GradientPoint
  /**
   * Optional stop positions. If supplied at mount, must remain supplied (and
   * the same length as `colors`) for the lifetime of the component.
   */
  locations?: readonly number[]
  /**
   * Initial frame override. When present, the component mounts displaying
   * these values, then animates to `animate` on the next effect. Pass `false`
   * to skip the initial-mount animation entirely.
   */
  initial?: LinearGradientAnimate | false
  /** Target animation state. */
  animate?: LinearGradientAnimate
  /**
   * Transition config — either a single `TransitionConfig` applied to every
   * animated dimension, or a per-property map (`{ colors, start, end,
   * locations }`). Per-property entries win over the top-level transition.
   */
  transition?: LinearGradientTransition
}

/**
 * Animatable `LinearGradient`. Wraps `expo-linear-gradient`'s `LinearGradient`
 * with declarative `initial` / `animate` / `transition` props.
 *
 * Animatable dimensions:
 * - `colors` — array of color strings, element-wise interpolated. Slot count
 *   is locked at mount.
 * - `start` / `end` — `{ x, y }` points; x and y animate independently.
 * - `locations` — array of stop positions, element-wise interpolated. Locked
 *   to the same length as `colors` (and to its presence at mount).
 *
 * Example:
 * ```tsx
 * <MotionLinearGradient
 *   colors={['#0f172a', '#1e293b']}
 *   animate={{ colors: ['#7c3aed', '#0ea5e9'] }}
 *   transition={{ type: 'timing', duration: 600 }}
 *   style={StyleSheet.absoluteFill}
 * />
 * ```
 */
export function MotionLinearGradient(props: MotionLinearGradientProps) {
  const {
    colors,
    start = DEFAULT_START,
    end = DEFAULT_END,
    locations,
    initial,
    animate,
    transition,
    ...rest
  } = props

  // Slot count is locked at first render; subsequent renders must keep
  // `colors.length` constant so the hook order (one `useSharedValue` per slot
  // below) stays stable. `locations` presence is similarly locked because we
  // allocate its shared-value table on the same path.
  const slotCountRef = useRef(colors.length)
  const hasLocationsRef = useRef(locations !== undefined)

  if (__DEV__) {
    if (slotCountRef.current !== colors.length) {
      throw new Error(
        `[inertia-gradients] colors length changed from ${slotCountRef.current} to ${colors.length} — colors length is locked at mount; remount via key={...} to resize.`,
      )
    }
    if (hasLocationsRef.current !== (locations !== undefined)) {
      throw new Error(
        `[inertia-gradients] locations presence changed — locations must be either always present or always absent (locked at mount).`,
      )
    }
    if (locations !== undefined && locations.length !== slotCountRef.current) {
      throw new Error(
        `[inertia-gradients] locations length (${locations.length}) must match colors length (${slotCountRef.current}).`,
      )
    }
  }

  // `initial: false` means "start at the animate target — no mount animation".
  // `initial: {...}` overrides the static prop with explicit initial values.
  // `initial: undefined` (default) seeds from the static props.
  const seedSource = initial === false ? animate : (initial ?? undefined)
  const seedColors = seedSource?.colors ?? colors
  const seedStart = seedSource?.start ?? start
  const seedEnd = seedSource?.end ?? end
  const seedLocations = seedSource?.locations ?? locations

  // Loop-of-hooks pattern: safe because slotCountRef enforces a constant
  // length. ESLint can't see the invariant, so we suppress per call site.
  const colorSvs: SharedValue<string>[] = []
  for (let i = 0; i < slotCountRef.current; i++) {
    // Slot `i` is in-bounds for `colors` by the length lock, but TS sees a
    // generic `readonly string[]` index so coerce via a non-null fallback.
    const seed = seedColors[i] ?? colors[i] ?? ''
    // eslint-disable-next-line react-hooks/rules-of-hooks
    colorSvs.push(useSharedValue<string>(seed))
  }

  const startX = useSharedValue(seedStart.x)
  const startY = useSharedValue(seedStart.y)
  const endX = useSharedValue(seedEnd.x)
  const endY = useSharedValue(seedEnd.y)

  const locationSvs: SharedValue<number>[] = []
  for (let i = 0; i < slotCountRef.current; i++) {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    locationSvs.push(useSharedValue<number>(seedLocations?.[i] ?? 0))
  }

  const reduce = useShouldReduceMotion()

  // Serialize targets into scalar keys so effects re-run on value change, not
  // on every parent re-render (a fresh `animate` literal each render is the
  // common case in callers).
  const colorsKey = animate?.colors ? animate.colors.join('|') : ''
  const startKey = animate?.start ? `${animate.start.x},${animate.start.y}` : ''
  const endKey = animate?.end ? `${animate.end.x},${animate.end.y}` : ''
  const locationsKey = animate?.locations ? animate.locations.join('|') : ''

  const animateColors = animate?.colors
  const animateStart = animate?.start
  const animateEnd = animate?.end
  const animateLocations = animate?.locations

  useEffect(() => {
    if (!animateColors) return
    const cfg = reduce ? NO_ANIMATION : pickTransition(transition, 'colors')
    for (let i = 0; i < colorSvs.length; i++) {
      const target = animateColors[i] ?? colors[i] ?? ''
      colorSvs[i]!.value = resolveTransition(cfg, target) as string
    }
    // colorSvs / colors are stable across renders by the length-lock above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [colorsKey, reduce, transition])

  useEffect(() => {
    if (!animateStart) return
    const cfg = reduce ? NO_ANIMATION : pickTransition(transition, 'start')
    startX.value = resolveTransition(cfg, animateStart.x) as number
    startY.value = resolveTransition(cfg, animateStart.y) as number
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startKey, reduce, transition])

  useEffect(() => {
    if (!animateEnd) return
    const cfg = reduce ? NO_ANIMATION : pickTransition(transition, 'end')
    endX.value = resolveTransition(cfg, animateEnd.x) as number
    endY.value = resolveTransition(cfg, animateEnd.y) as number
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endKey, reduce, transition])

  useEffect(() => {
    if (!animateLocations) return
    const cfg = reduce ? NO_ANIMATION : pickTransition(transition, 'locations')
    for (let i = 0; i < locationSvs.length; i++) {
      const target = animateLocations[i]
      if (target !== undefined) {
        locationSvs[i]!.value = resolveTransition(cfg, target) as number
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locationsKey, reduce, transition])

  const animatedProps = useAnimatedProps(() => {
    'worklet'
    const colorsOut = new Array<string>(colorSvs.length)
    for (let i = 0; i < colorSvs.length; i++) colorsOut[i] = colorSvs[i]!.value
    const out: {
      colors: string[]
      start: GradientPoint
      end: GradientPoint
      locations?: number[]
    } = {
      colors: colorsOut,
      start: { x: startX.value, y: startY.value },
      end: { x: endX.value, y: endY.value },
    }
    if (hasLocationsRef.current) {
      const locsOut = new Array<number>(locationSvs.length)
      for (let i = 0; i < locationSvs.length; i++)
        locsOut[i] = locationSvs[i]!.value
      out.locations = locsOut
    }
    return out
  })

  return (
    <AnimatedLinearGradient
      // `animatedProps` overrides the static `colors` / `start` / `end` /
      // `locations` each frame; the static props below are the first-render
      // seeds so the gradient renders before the first effect tick. The cast
      // sheds Reanimated's strict-tuple constraint that the worklet's return
      // type can't express — the runtime value is the same shape.
      animatedProps={animatedProps as never}
      colors={colors}
      start={start}
      end={end}
      locations={locations as never}
      {...rest}
    />
  )
}

declare const __DEV__: boolean
