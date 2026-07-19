import { useEffect, useRef, type ComponentType } from 'react'
import Animated, {
  useAnimatedProps,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated'
import {
  resolveNamedTransition,
  resolveTransition,
  useNamedTransitions,
  useShouldReduceMotion,
  type NamedTransitions,
  type TransitionConfig,
  type TransitionInput,
} from '@rootnative/inertia'

const NO_ANIMATION: TransitionConfig = { type: 'no-animation' }

/** String keys of the wrapped component's props. */
type SvgKey<P> = Extract<keyof P, string>

/**
 * Animatable target snapshot for a factory-built motion SVG component. Every
 * field is optional — include only the dimensions you want to animate; the
 * rest fall back to the static props on the component.
 */
export type SvgAnimate<
  NK extends string = never,
  CK extends string = never,
  AK extends string = never,
> = Partial<Record<NK, number>> &
  Partial<Record<CK, string>> &
  Partial<Record<AK, readonly number[]>>

/**
 * Per-property transition map for a factory-built motion SVG component. Each
 * entry accepts a `TransitionConfig` or a `TransitionName` registered on the
 * nearest `<MotionConfig transitions>`.
 */
export type SvgPerPropertyTransition<K extends string> = Partial<
  Record<K, TransitionInput>
>

/**
 * Transition shape accepted by factory-built motion SVG components: a single
 * config (or registered name) applied to every animated dimension, or a
 * per-property map. Per-property entries win over the top-level transition.
 */
export type SvgTransition<K extends string> =
  | TransitionInput
  | SvgPerPropertyTransition<K>

/**
 * Configuration for `createMotionSvgComponent`. Declares which of the wrapped
 * component's props are animatable and how each interpolates:
 *
 * - `animatableProps` — numeric props (`cx`, `r`, `strokeDashoffset`, …),
 *   spring / timing / decay-driven.
 * - `colorProps` — color-string props (`fill`, `stroke`), interpolated via
 *   Reanimated's native color animation.
 * - `arrayProps` — numeric-array props (`strokeDasharray`), interpolated
 *   element-wise. **The array length is locked at first render** — the same
 *   shape-locked-at-mount rule `MotionPath` applies to path commands. Remount
 *   with a new `key` to change the length.
 */
export interface CreateMotionSvgComponentConfig<
  P,
  NK extends SvgKey<P>,
  CK extends SvgKey<P>,
  AK extends SvgKey<P>,
> {
  animatableProps: readonly NK[]
  colorProps?: readonly CK[]
  arrayProps?: readonly AK[]
}

/**
 * Props of a factory-built motion SVG component: the wrapped component's own
 * props (with the animatable keys narrowed to the animatable value shape)
 * plus `initial` / `animate` / `transition`.
 */
export type MotionSvgComponentProps<
  P,
  NK extends string,
  CK extends string,
  AK extends string,
> = Omit<P, NK | CK | AK> &
  Partial<Record<NK, number>> &
  Partial<Record<CK, string>> &
  Partial<Record<AK, readonly number[]>> & {
    /**
     * Initial frame override. When present, the component mounts displaying
     * these values, then animates to `animate` on the next effect. Pass
     * `false` to skip the initial-mount animation entirely.
     */
    initial?: SvgAnimate<NK, CK, AK> | false
    /** Target animation state. */
    animate?: SvgAnimate<NK, CK, AK>
    /**
     * Transition config — a single `TransitionConfig` (or `TransitionName`
     * registered on the nearest `<MotionConfig transitions>`) applied to
     * every animated dimension, or a per-property map. Per-property entries
     * win over the top-level transition.
     */
    transition?: SvgTransition<NK | CK | AK>
  }

function pickTransition(
  transition: SvgTransition<string> | undefined,
  key: string,
  registry: NamedTransitions,
): TransitionConfig | undefined {
  if (!transition) return undefined
  if (typeof transition === 'string' || 'type' in transition) {
    return resolveNamedTransition(transition as TransitionInput, registry)
  }
  return resolveNamedTransition(
    (transition as SvgPerPropertyTransition<string>)[key],
    registry,
  )
}

/**
 * Build an animatable wrapper around any `react-native-svg` element, driven
 * by the same `initial` / `animate` / `transition` shape as the core
 * `Motion.*` primitives. This is the mechanism behind the prebuilt
 * `MotionCircle` / `MotionRect` / `MotionLine` — use it directly for any
 * element the package doesn't prebuild (`Ellipse`, `Stop`, …).
 *
 * Semantics shared with the rest of the library:
 *
 * - `transition` accepts a config, a registered `TransitionName`, or a
 *   per-property map (entries accept names too); names resolve at the
 *   nearest `<MotionConfig transitions>`.
 * - `<MotionConfig reducedMotion>` collapses every transition to
 *   `no-animation` so values snap.
 * - `initial` seeds the first frame and is read once on mount;
 *   `initial={false}` mounts directly at the `animate` target.
 *
 * Factory-specific rules:
 *
 * - **A key only renders through the animation pipeline when it is present
 *   at mount** — in the static props, `initial`, or `animate`. Keys
 *   introduced into `animate` after mount warn in dev and are ignored
 *   (remount with `key={...}` to pick them up). Keys never engaged pass
 *   through as ordinary static props.
 * - **Array props lock their length at first render.** Element-wise
 *   interpolation needs a stable slot count — a target with a different
 *   length throws in dev and is ignored in production.
 * - Numeric keys engaged only via `animate` seed from `0`; color keys seed
 *   from `'transparent'`. Provide a static prop or `initial` value when the
 *   mount animation should start elsewhere.
 *
 * @example An animatable `<Ellipse>`
 * ```tsx
 * import { Ellipse } from 'react-native-svg'
 * import { createMotionSvgComponent } from '@rootnative/inertia-svg'
 *
 * const MotionEllipse = createMotionSvgComponent(Ellipse, {
 *   animatableProps: ['cx', 'cy', 'rx', 'ry', 'opacity'],
 *   colorProps: ['fill', 'stroke'],
 * })
 *
 * <MotionEllipse
 *   cx={50} cy={50} rx={10} ry={20}
 *   animate={{ rx: 30, fill: '#7c3aed' }}
 *   transition={{ type: 'spring', tension: 180, friction: 14 }}
 * />
 * ```
 */
export function createMotionSvgComponent<
  P extends object,
  NK extends SvgKey<P>,
  CK extends SvgKey<P> = never,
  AK extends SvgKey<P> = never,
>(
  Component: ComponentType<P>,
  config: CreateMotionSvgComponentConfig<P, NK, CK, AK>,
): ComponentType<MotionSvgComponentProps<P, NK, CK, AK>> {
  const AnimatedComponent = Animated.createAnimatedComponent(
    Component as ComponentType<Record<string, unknown>>,
  )
  const numericKeys = config.animatableProps
  const colorKeys = config.colorProps ?? []
  const arrayKeys = config.arrayProps ?? []

  function MotionSvgComponent(props: MotionSvgComponentProps<P, NK, CK, AK>) {
    const { initial, animate, transition, ...rest } = props
    const statics = rest as Record<string, unknown>
    const seedSource = initial === false ? animate : (initial ?? undefined)
    const reduce = useShouldReduceMotion()
    const registry = useNamedTransitions()

    // Lock the engaged key set and array lengths at mount. A key is engaged
    // when any source defines it on the first render; only engaged keys are
    // written by the worklet, so un-animated props keep their static /
    // element-default rendering instead of being stomped by generic seeds.
    const mountRef = useRef<{
      engaged: Record<string, boolean>
      engagedNumeric: string[]
      engagedColor: string[]
      engagedArray: string[]
      arrayLengths: Record<string, number>
    } | null>(null)
    if (mountRef.current === null) {
      const engaged: Record<string, boolean> = {}
      const engagedNumeric: string[] = []
      const engagedColor: string[] = []
      const engagedArray: string[] = []
      const arrayLengths: Record<string, number> = {}
      const anim = animate as SvgAnimate<string, string, string> | undefined
      const seed = seedSource as SvgAnimate<string, string, string> | undefined
      for (const k of numericKeys) {
        engaged[k] =
          seed?.[k] !== undefined ||
          anim?.[k] !== undefined ||
          statics[k] !== undefined
        if (engaged[k]) engagedNumeric.push(k)
      }
      for (const k of colorKeys) {
        engaged[k] =
          seed?.[k] !== undefined ||
          anim?.[k] !== undefined ||
          statics[k] !== undefined
        if (engaged[k]) engagedColor.push(k)
      }
      for (const k of arrayKeys) {
        const src = seed?.[k] ?? statics[k] ?? anim?.[k]
        arrayLengths[k] = Array.isArray(src) ? src.length : 0
        engaged[k] = arrayLengths[k] > 0
        if (engaged[k]) engagedArray.push(k)
      }
      mountRef.current = {
        engaged,
        engagedNumeric,
        engagedColor,
        engagedArray,
        arrayLengths,
      }
    }
    const {
      engaged,
      engagedNumeric,
      engagedColor,
      engagedArray,
      arrayLengths,
    } = mountRef.current

    const seed = seedSource as SvgAnimate<string, string, string> | undefined
    const anim = animate as SvgAnimate<string, string, string> | undefined

    // Loop-of-hooks over the config key lists — safe because the lists are
    // fixed at factory time and array lengths are locked at mount above.
    const numericSvs: Record<string, SharedValue<number>> = {}
    for (const k of numericKeys) {
      // eslint-disable-next-line react-hooks/rules-of-hooks
      numericSvs[k] = useSharedValue<number>(
        (seed?.[k] ?? statics[k] ?? 0) as number,
      )
    }
    const colorSvs: Record<string, SharedValue<string>> = {}
    for (const k of colorKeys) {
      // eslint-disable-next-line react-hooks/rules-of-hooks
      colorSvs[k] = useSharedValue<string>(
        (seed?.[k] ?? statics[k] ?? 'transparent') as string,
      )
    }
    const arraySvs: Record<string, SharedValue<number>[]> = {}
    for (const k of arrayKeys) {
      const len = arrayLengths[k]!
      const seedArr = (seed?.[k] ?? statics[k] ?? anim?.[k]) as
        | readonly number[]
        | undefined
      const svs: SharedValue<number>[] = []
      for (let i = 0; i < len; i++) {
        // eslint-disable-next-line react-hooks/rules-of-hooks
        svs.push(useSharedValue<number>(Number(seedArr?.[i]) || 0))
      }
      arraySvs[k] = svs
    }

    if (__DEV__) {
      // Mirror MotionPath's template guard: a static array prop that changes
      // length after mount silently breaks element-wise interpolation, so
      // fail loudly in dev.
      for (const k of arrayKeys) {
        const v = statics[k]
        if (Array.isArray(v) && engaged[k] && v.length !== arrayLengths[k]) {
          throw new Error(
            `[inertia-svg] ${k} length changed after mount ` +
              `(${arrayLengths[k]} → ${v.length}). Array props are locked at ` +
              `first render — remount with key={...} to change the length.`,
          )
        }
      }
    }

    // One effect per configured key (fixed count). Targets are read into
    // locals so the dep arrays key on the values, not on a fresh `animate`
    // literal each render.
    for (const k of numericKeys) {
      const target = anim?.[k] as number | undefined
      // eslint-disable-next-line react-hooks/rules-of-hooks
      useEffect(() => {
        if (target === undefined) return
        if (!engaged[k]) {
          if (__DEV__) warnNotEngaged(k)
          return
        }
        const cfg = reduce
          ? NO_ANIMATION
          : pickTransition(transition, k, registry)
        numericSvs[k]!.value = resolveTransition(cfg, target) as number
        // SVs / engaged set are mount-stable; registry changes re-resolve via
        // the transition dep on the next animate change.
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, [target, reduce, transition])
    }

    for (const k of colorKeys) {
      const target = anim?.[k] as string | undefined
      // eslint-disable-next-line react-hooks/rules-of-hooks
      useEffect(() => {
        if (target === undefined) return
        if (!engaged[k]) {
          if (__DEV__) warnNotEngaged(k)
          return
        }
        const cfg = reduce
          ? NO_ANIMATION
          : pickTransition(transition, k, registry)
        colorSvs[k]!.value = resolveTransition(cfg, target) as string
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, [target, reduce, transition])
    }

    for (const k of arrayKeys) {
      const target = anim?.[k] as readonly number[] | undefined
      const sig = target ? target.join(',') : undefined
      // eslint-disable-next-line react-hooks/rules-of-hooks
      useEffect(() => {
        if (target === undefined) return
        if (!engaged[k]) {
          if (__DEV__) warnNotEngaged(k)
          return
        }
        const len = arrayLengths[k]!
        if (target.length !== len) {
          if (__DEV__) {
            throw new Error(
              `[inertia-svg] animate.${k} length mismatch ` +
                `(${len} → ${target.length}). Array props are locked at ` +
                `first render — remount with key={...} to change the length.`,
            )
          }
          return
        }
        const cfg = reduce
          ? NO_ANIMATION
          : pickTransition(transition, k, registry)
        const svs = arraySvs[k]!
        for (let i = 0; i < len; i++) {
          svs[i]!.value = resolveTransition(cfg, target[i] ?? 0) as number
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, [sig, reduce, transition])
    }

    const animatedProps = useAnimatedProps(() => {
      'worklet'
      const out: Record<string, unknown> = {}
      for (let i = 0; i < engagedNumeric.length; i++) {
        const k = engagedNumeric[i]!
        out[k] = numericSvs[k]!.value
      }
      for (let i = 0; i < engagedColor.length; i++) {
        const k = engagedColor[i]!
        out[k] = colorSvs[k]!.value
      }
      for (let i = 0; i < engagedArray.length; i++) {
        const k = engagedArray[i]!
        const svs = arraySvs[k]!
        const arr = new Array<number>(svs.length)
        for (let j = 0; j < svs.length; j++) arr[j] = svs[j]!.value
        out[k] = arr
      }
      return out
    })

    return (
      // `animatedProps` overrides every engaged key each frame; the static
      // props in `rest` are the first-render seeds so the element renders
      // before the first effect tick. The cast sheds Reanimated's strict-prop
      // constraint that the worklet's return type can't express — the runtime
      // shape is the same.
      <AnimatedComponent animatedProps={animatedProps as never} {...statics} />
    )
  }

  const base = Component.displayName ?? Component.name ?? 'SvgComponent'
  MotionSvgComponent.displayName = `Motion${base}`

  return MotionSvgComponent as ComponentType<
    MotionSvgComponentProps<P, NK, CK, AK>
  >
}

function warnNotEngaged(key: string) {
  console.warn(
    `[inertia-svg] animate.${key} was introduced after mount — the key ` +
      `wasn't present at mount (static prop, initial, or animate), so its ` +
      `animated value can't render. Include ${key} at mount or remount ` +
      `with key={...}.`,
  )
}

declare const __DEV__: boolean
