import { useEffect, useMemo, useRef } from 'react'
import { Path, type PathProps } from 'react-native-svg'
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
import {
  diffTemplate,
  flattenParams,
  parsePathD,
  serializePath,
  templateOf,
  type PathTemplate,
} from './path'
import type {
  PathAnimate,
  PathPerPropertyTransition,
  PathTransition,
} from './types'

const AnimatedPath = Animated.createAnimatedComponent(Path)

const NO_ANIMATION: TransitionConfig = { type: 'no-animation' }

function pickTransition(
  per: PathTransition | undefined,
  key: keyof PathPerPropertyTransition,
): TransitionConfig | undefined {
  if (!per) return undefined
  if ('type' in per) return per as TransitionConfig
  return (per as PathPerPropertyTransition)[key]
}

export interface MotionPathProps extends Omit<
  PathProps,
  | 'd'
  | 'fill'
  | 'stroke'
  | 'strokeWidth'
  | 'strokeOpacity'
  | 'fillOpacity'
  | 'opacity'
  | 'strokeDashoffset'
> {
  /**
   * Initial path data. **The command sequence is locked at first render** —
   * every target `d` passed via `animate` / `initial` must produce the same
   * command letters in the same order after implicit-repeat expansion. To
   * morph between structurally different paths, remount with a new `key`.
   */
  d: string
  fill?: string
  stroke?: string
  strokeWidth?: number
  strokeOpacity?: number
  fillOpacity?: number
  opacity?: number
  strokeDashoffset?: number
  /**
   * Initial frame override. When present, the component mounts displaying
   * these values, then animates to `animate` on the next effect. Pass `false`
   * to skip the initial-mount animation entirely.
   */
  initial?: PathAnimate | false
  /** Target animation state. */
  animate?: PathAnimate
  /**
   * Transition config — either a single `TransitionConfig` applied to every
   * animated dimension, or a per-property map. Per-property entries win over
   * the top-level transition.
   */
  transition?: PathTransition
}

/**
 * Animatable `<Path>` from `react-native-svg`. Wraps `Path` with declarative
 * `initial` / `animate` / `transition` props.
 *
 * Animatable dimensions:
 * - `d` — path morph via element-wise scalar interpolation. Source and target
 *   must share the same command sequence (e.g. both `M L L L Z`).
 * - `fill`, `stroke` — color strings, interpolated via Reanimated's native
 *   color animation.
 * - `strokeWidth`, `strokeOpacity`, `fillOpacity`, `opacity`,
 *   `strokeDashoffset` — numeric, spring or timing-driven.
 *
 * Example:
 * ```tsx
 * <Svg viewBox="0 0 100 100">
 *   <MotionPath
 *     d="M 50 20 L 80 80 L 20 80 Z"
 *     animate={{ d: "M 50 80 L 80 20 L 20 20 Z", fill: '#7c3aed' }}
 *     transition={{ type: 'spring', tension: 140, friction: 12 }}
 *     fill="#0ea5e9"
 *   />
 * </Svg>
 * ```
 */
export function MotionPath(props: MotionPathProps) {
  const {
    d,
    fill,
    stroke,
    strokeWidth,
    strokeOpacity,
    fillOpacity,
    opacity,
    strokeDashoffset,
    initial,
    animate,
    transition,
    ...rest
  } = props

  // Parse + freeze the source template at mount. The number of scalar params
  // is locked here so the shared-value array allocated below has a stable
  // length across renders.
  const sourceRef = useRef<{
    template: PathTemplate
    params: number[]
  } | null>(null)
  if (sourceRef.current === null) {
    const segments = parsePathD(d)
    sourceRef.current = {
      template: templateOf(segments),
      params: flattenParams(segments),
    }
  }
  const template = sourceRef.current.template

  if (__DEV__) {
    // Re-parse the current `d` prop and verify the template hasn't shifted.
    // Catches the easy mistake of swapping a star for a hexagon without
    // remounting via `key`.
    const segments = parsePathD(d)
    const live = templateOf(segments)
    const err = diffTemplate(template, live)
    if (err) {
      throw new Error(
        `[inertia-svg] d prop template changed after mount: ${err}\n` +
          `If you need to swap to a structurally different path, remount with key={...}.`,
      )
    }
  }

  // `initial: false` → start at the animate target (no mount animation).
  // `initial: {...}` → explicit seed values.
  // `initial: undefined` → seed from the static props.
  const seedSource = initial === false ? animate : (initial ?? undefined)

  // Seed the path params. If `initial.d` is provided, parse it and verify
  // it's template-compatible before seeding.
  const seedParams: number[] = useMemo(() => {
    if (!seedSource?.d) return sourceRef.current!.params
    const segs = parsePathD(seedSource.d)
    const t = templateOf(segs)
    const err = diffTemplate(template, t)
    if (err) {
      if (__DEV__) {
        throw new Error(`[inertia-svg] initial.d template mismatch: ${err}`)
      }
      return sourceRef.current!.params
    }
    return flattenParams(segs)
    // template is stable for the component's lifetime; seedSource is the
    // only meaningful input. We intentionally ignore `template` in deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seedSource?.d])

  // Loop-of-hooks per scalar param — safe because `template.size` is locked
  // at mount via the source ref above.
  const paramSvs: SharedValue<number>[] = []
  for (let i = 0; i < template.size; i++) {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    paramSvs.push(useSharedValue<number>(seedParams[i] ?? 0))
  }

  // Scalar property SVs. Strings (`fill`, `stroke`) use color seeds so
  // Reanimated recognizes them as colors from frame 1.
  const fillSv = useSharedValue<string>(
    seedSource?.fill ?? fill ?? 'transparent',
  )
  const strokeSv = useSharedValue<string>(
    seedSource?.stroke ?? stroke ?? 'transparent',
  )
  const strokeWidthSv = useSharedValue<number>(
    seedSource?.strokeWidth ?? strokeWidth ?? 1,
  )
  const strokeOpacitySv = useSharedValue<number>(
    seedSource?.strokeOpacity ?? strokeOpacity ?? 1,
  )
  const fillOpacitySv = useSharedValue<number>(
    seedSource?.fillOpacity ?? fillOpacity ?? 1,
  )
  const opacitySv = useSharedValue<number>(seedSource?.opacity ?? opacity ?? 1)
  const strokeDashoffsetSv = useSharedValue<number>(
    seedSource?.strokeDashoffset ?? strokeDashoffset ?? 0,
  )

  const reduce = useShouldReduceMotion()

  // Serialize scalar targets into stable keys so effects re-run on value
  // change, not on every parent re-render (a fresh `animate` literal each
  // render is the common case).
  const animateD = animate?.d
  const animateFill = animate?.fill
  const animateStroke = animate?.stroke
  const animateStrokeWidth = animate?.strokeWidth
  const animateStrokeOpacity = animate?.strokeOpacity
  const animateFillOpacity = animate?.fillOpacity
  const animateOpacity = animate?.opacity
  const animateStrokeDashoffset = animate?.strokeDashoffset

  useEffect(() => {
    if (animateD === undefined) return
    const segments = parsePathD(animateD)
    const t = templateOf(segments)
    const err = diffTemplate(template, t)
    if (err) {
      if (__DEV__) {
        throw new Error(`[inertia-svg] animate.d template mismatch: ${err}`)
      }
      return
    }
    const target = flattenParams(segments)
    const cfg = reduce ? NO_ANIMATION : pickTransition(transition, 'd')
    for (let i = 0; i < paramSvs.length; i++) {
      paramSvs[i]!.value = resolveTransition(cfg, target[i] ?? 0) as number
    }
    // paramSvs / template are stable across renders by the locks above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animateD, reduce, transition])

  useEffect(() => {
    if (animateFill === undefined) return
    const cfg = reduce ? NO_ANIMATION : pickTransition(transition, 'fill')
    fillSv.value = resolveTransition(cfg, animateFill) as string
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animateFill, reduce, transition])

  useEffect(() => {
    if (animateStroke === undefined) return
    const cfg = reduce ? NO_ANIMATION : pickTransition(transition, 'stroke')
    strokeSv.value = resolveTransition(cfg, animateStroke) as string
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animateStroke, reduce, transition])

  useEffect(() => {
    if (animateStrokeWidth === undefined) return
    const cfg = reduce
      ? NO_ANIMATION
      : pickTransition(transition, 'strokeWidth')
    strokeWidthSv.value = resolveTransition(cfg, animateStrokeWidth) as number
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animateStrokeWidth, reduce, transition])

  useEffect(() => {
    if (animateStrokeOpacity === undefined) return
    const cfg = reduce
      ? NO_ANIMATION
      : pickTransition(transition, 'strokeOpacity')
    strokeOpacitySv.value = resolveTransition(
      cfg,
      animateStrokeOpacity,
    ) as number
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animateStrokeOpacity, reduce, transition])

  useEffect(() => {
    if (animateFillOpacity === undefined) return
    const cfg = reduce
      ? NO_ANIMATION
      : pickTransition(transition, 'fillOpacity')
    fillOpacitySv.value = resolveTransition(cfg, animateFillOpacity) as number
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animateFillOpacity, reduce, transition])

  useEffect(() => {
    if (animateOpacity === undefined) return
    const cfg = reduce ? NO_ANIMATION : pickTransition(transition, 'opacity')
    opacitySv.value = resolveTransition(cfg, animateOpacity) as number
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animateOpacity, reduce, transition])

  useEffect(() => {
    if (animateStrokeDashoffset === undefined) return
    const cfg = reduce
      ? NO_ANIMATION
      : pickTransition(transition, 'strokeDashoffset')
    strokeDashoffsetSv.value = resolveTransition(
      cfg,
      animateStrokeDashoffset,
    ) as number
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animateStrokeDashoffset, reduce, transition])

  const animatedProps = useAnimatedProps(() => {
    'worklet'
    const params = new Array<number>(paramSvs.length)
    for (let i = 0; i < paramSvs.length; i++) params[i] = paramSvs[i]!.value
    return {
      d: serializePath(template, params),
      fill: fillSv.value,
      stroke: strokeSv.value,
      strokeWidth: strokeWidthSv.value,
      strokeOpacity: strokeOpacitySv.value,
      fillOpacity: fillOpacitySv.value,
      opacity: opacitySv.value,
      strokeDashoffset: strokeDashoffsetSv.value,
    }
  })

  return (
    <AnimatedPath
      // `animatedProps` overrides every animated key each frame; the static
      // props below are the first-render seeds so the path renders before the
      // first effect tick. The cast sheds Reanimated's strict-prop constraint
      // that the worklet's return type can't express — the runtime shape is
      // the same.
      animatedProps={animatedProps as never}
      d={d}
      fill={fill}
      stroke={stroke}
      strokeWidth={strokeWidth}
      strokeOpacity={strokeOpacity}
      fillOpacity={fillOpacity}
      opacity={opacity}
      strokeDashoffset={strokeDashoffset}
      {...rest}
    />
  )
}

declare const __DEV__: boolean
