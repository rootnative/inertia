import {
  type ComponentProps,
  type ComponentType,
  type ReactElement,
  type Ref,
} from 'react'
import { type StyleProp } from 'react-native'

/**
 * A single animation step's destination, optionally overriding the transition
 * for that step.
 */
export type SequenceStep<V> = V | ({ to: V; delay?: number } & TransitionConfig)

/**
 * A target value for an animatable property: a single value, a sequence of
 * steps (keyframes), or a single step object.
 */
export type AnimatableValue<V> =
  | V
  | SequenceStep<V>
  | ReadonlyArray<SequenceStep<V>>

/**
 * Spring transition — public surface uses react-spring vocabulary
 * (`tension` / `friction` / `mass`), not Reanimated's raw stiffness/damping.
 */
export interface SpringTransition {
  type?: 'spring'
  tension?: number
  friction?: number
  mass?: number
  velocity?: number
  restSpeedThreshold?: number
  restDisplacementThreshold?: number
  delay?: number
  repeat?: RepeatConfig
}

/**
 * Easing input accepted by `TimingTransition`. Either a plain easing function
 * `(t: number) => number` (the pre-Reanimated-4 shape and the shape consumers
 * author by hand) or an `EasingFunctionFactory` (the Reanimated 4 shape
 * returned by `Easing.bezier(...)` and similar builders). The resolver
 * unwraps the factory automatically — consumers don't have to call
 * `.factory()` themselves.
 */
export type EasingFunction = (t: number) => number
export interface EasingFunctionFactory {
  factory: () => EasingFunction
}
export type EasingInput = EasingFunction | EasingFunctionFactory

export interface TimingTransition {
  type: 'timing'
  duration?: number
  easing?: EasingInput
  delay?: number
  repeat?: RepeatConfig
}

export interface DecayTransition {
  type: 'decay'
  velocity?: number
  deceleration?: number
  clamp?: [number, number]
  delay?: number
}

export interface NoAnimationTransition {
  type: 'no-animation'
}

export type TransitionConfig =
  | SpringTransition
  | TimingTransition
  | DecayTransition
  | NoAnimationTransition

/**
 * Repeat config — one shape, not three flags. Default `alternate: true`.
 */
export type RepeatConfig =
  | number
  | 'infinite'
  | { count: number | 'infinite'; alternate?: boolean }

/**
 * Per-property transition map. Keys must match keys present on `animate`.
 * Top-level entries on `transition` apply to all properties unless overridden
 * here.
 */
export type PerPropertyTransition<S> = {
  [K in keyof S]?: TransitionConfig
}

/**
 * Per-gesture-layer transition map. Each `gesture` sub-state animates a
 * progress value 0↔1 with its own transition; the worklet composites the
 * layers in priority order (`hovered → focused → focusVisible → pressed`).
 *
 * Keys live on the same `transition` object as `PerPropertyTransition` because
 * the only other place they could go (nested inside `gesture` itself) would
 * collide with the primitive's inferred style keys.
 */
export interface GestureLayerTransitions {
  pressed?: TransitionConfig
  focused?: TransitionConfig
  focusVisible?: TransitionConfig
  hovered?: TransitionConfig
}

export type Transition<S> =
  | TransitionConfig
  | (PerPropertyTransition<S> & GestureLayerTransitions)

/**
 * Transform shorthands that Inertia exposes on `animate` but that don't
 * appear on RN's typed ViewStyle as top-level keys. RN keeps `scale`,
 * `rotate`, `rotateX`, and `rotateY` inside the `transform` array; only
 * `scaleX`/`scaleY` and `translateX`/`translateY` are surfaced as
 * (deprecated) top-level shortcuts. Inertia's runtime treats these as
 * transform-group keys (see `TRANSFORM_KEYS` in `createMotionComponent`),
 * so they're documented as first-class animatables in `CLAUDE.md` and must
 * be reachable from `animate` without dropping into the `transform: [...]`
 * array form. Rotation values are degrees as numbers — the runtime appends
 * `'deg'` before handing the transform to Reanimated.
 */
type AnimatableTransformExtras = {
  scale?: AnimatableValue<number>
  rotate?: AnimatableValue<number>
  rotateX?: AnimatableValue<number>
  rotateY?: AnimatableValue<number>
}

/**
 * The animation state shape inferred from the underlying component's style
 * prop. We narrow to the value side of `style` so consumers see ViewStyle on
 * `Motion.View`, TextStyle on `Motion.Text`, etc. — no shared union.
 *
 * Some components (notably `Pressable`) type `style` as a union of
 * `StyleProp<T>` and a callback `(state) => StyleProp<T>`. If we infer `S`
 * directly from `StyleProp<infer S>`, the callback branch widens `S` to
 * `unknown`, which collapses the animate map to `| {}` and silently
 * accepts any key. Excluding functions first keeps inference tight.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type _StyleValue<T> = Exclude<T, (...args: any[]) => any>

export type AnimateStyle<C> = C extends { style?: infer Raw }
  ? _StyleValue<Raw> extends StyleProp<infer S>
    ? { [K in keyof S]?: AnimatableValue<S[K]> } & AnimatableTransformExtras
    : never
  : never

export interface AnimationCallbackInfo<S> {
  /**
   * The animatable key that just settled — typically a `keyof S` (e.g.
   * `'opacity'`, `'translateX'`). The sentinel `'transform'` is emitted in
   * lieu of any specific transform axis (`translateX`/`Y`, `scale`/`X`/`Y`,
   * `rotate`) when the terminal `'animation'` phase fires for a transform
   * group, so a multi-axis translate produces one callback rather than two.
   */
  key: keyof S | 'transform'
  finished: boolean
  value: unknown
  target: unknown
  phase: 'step' | 'sequence' | 'repeat' | 'animation'
  step: number | undefined
  iteration: number
}

/**
 * A variants map: string state names → animate target objects.
 */
export type VariantsMap<C> = Record<string, AnimateStyle<C>>

/**
 * Gesture sub-states accepted by the `gesture` prop on every Motion primitive.
 *
 * - `pressed` — active while the user is touching the component (touch start
 *   to touch end / cancel).
 * - `focused` — active while a focusable component owns focus, regardless of
 *   how focus arrived (mouse, touch, or keyboard). No-op for non-focusable
 *   underlying components.
 * - `focusVisible` — active only when focus arrived from the keyboard
 *   (W3C `:focus-visible` semantics). Use this for focus rings to avoid
 *   flashing them on click-focus on web. On native — where focus always
 *   arrives via D-pad, screen reader, or hardware keyboard — this behaves
 *   identically to `focused`.
 * - `hovered` — web-only. Typed for cross-platform call sites; the runtime is
 *   a no-op on native.
 *
 * Sub-states layer additively. Each declared sub-state owns an independent
 * progress value (0↔1) that animates in/out with its own transition; the
 * worklet composites layers in priority order (lowest-to-highest):
 * `hovered → focused → focusVisible → pressed`. Per-property the chain is
 *
 *   v = base
 *   v = lerp(v, hovered.value,      progressHovered)      // if declared
 *   v = lerp(v, focused.value,      progressFocused)      // if declared
 *   v = lerp(v, focusVisible.value, progressFocusVisible) // if declared
 *   v = lerp(v, pressed.value,      progressPressed)      // if declared
 *
 * (Color-valued keys use `interpolateColor` instead of `lerp`.) When a single
 * sub-state is active, this collapses to "the highest-priority declared layer
 * wins". When multiple are mid-transition (e.g. release-while-still-hovered)
 * each layer fades independently — a press layer fading out at 50ms while a
 * hover layer holds at full opacity matches MD3 state-layer semantics.
 *
 * Configure per-layer fade timing via `transition.<stateName>` on the parent
 * primitive (see `GestureLayerTransitions`); without it, layers default to
 * the parent transition or the library default spring.
 *
 * **Priority cascade is the only composition mode on this prop.** Non-priority
 * blends — clamped-max (`Math.max(hover*α, focus*β, press*γ)`, as used by MD3
 * state-layer haloes), additive accumulation, or any per-key custom blend —
 * are not expressible declaratively. Drop to `useGesture()` for those: it
 * returns the four progress shared values and a handler bag, and you write
 * a `useAnimatedStyle` block with whatever composition you need. The hook's
 * JSDoc shows the clamped-max halo pattern in full.
 */
export interface GestureSubStates<C> {
  pressed?: AnimateStyle<C>
  focused?: AnimateStyle<C>
  focusVisible?: AnimateStyle<C>
  hovered?: AnimateStyle<C>
}

/**
 * Controller returned by `useVariants`. The `current` shared state is read
 * via `controller` prop on a Motion primitive; `transitionTo` drives the
 * controller from JS code (event handlers, async chains, etc.).
 */
export interface VariantController<K extends string = string> {
  current: K
  // Method-shorthand on purpose: TS treats parameters as bivariant so a
  // `VariantController<'open' | 'closed'>` is assignable to the wider
  // `VariantController<string>` that the `controller` prop is typed against.
  transitionTo(next: K): void
  /** @internal — subscription used by Motion primitives to re-render. */
  subscribe(listener: (next: K) => void): () => void
}

/**
 * Props injected onto every Motion primitive.
 *
 * The second type parameter `V` is the concrete `variants` map. It is inferred
 * from the `variants` prop at each JSX use (see `MotionComponent`), which is
 * what lets `animate` narrow to the variant key union and reject typos. When
 * no `variants` prop is passed, `V` falls back to `VariantsMap<C>` — whose key
 * type is the open `string`, so `animate` still accepts any string and nothing
 * regresses for the variant-less case.
 */
export interface MotionProps<C, V extends VariantsMap<C> = VariantsMap<C>> {
  /**
   * Initial values applied on mount. Read once on mount and intentionally
   * non-reactive — to reset after a state change, change the component `key`,
   * remount via `<Presence>`, or drive the value through a controller.
   *
   * Pass `false` to skip the initial-mount animation entirely.
   */
  initial?: AnimateStyle<C> | false
  /**
   * The animation target. A style object, a variant key (when `variants` is
   * supplied), or an array of sequence steps. When `variants` is set, the
   * string form is narrowed to the map's keys, so a key typo is a compile
   * error and the keys autocomplete — no `as const` required.
   */
  animate?: AnimateStyle<C> | (keyof V & string)
  /**
   * Values applied while the component exits via `<Presence>`.
   */
  exit?: AnimateStyle<C>
  /**
   * Named animation states. With `variants` set, `animate` accepts a key from
   * this map.
   */
  variants?: V
  /**
   * Imperative controller from `useVariants(...)`. When supplied, `animate`
   * is read from `controller.current` and re-applied whenever the controller
   * transitions. `animate` and `controller` should not both be set.
   */
  controller?: VariantController<keyof V & string>
  /**
   * Gesture-driven sub-states (`pressed`, `focused`, `focusVisible`,
   * `hovered`). When omitted, no handlers are mounted on the underlying
   * component. Each declared sub-state animates as an independent layer
   * fading in/out over the base `animate` target — see `GestureSubStates`
   * for the composition model and per-layer transition wiring.
   */
  gesture?: GestureSubStates<C>
  /**
   * Per-property or top-level transition config. Per-property entries take
   * precedence over the top-level transition.
   */
  transition?: Transition<AnimateStyle<C>>
  /**
   * Auto-layout animation. When the component's position or size changes
   * because of a parent layout change (a flex sibling growing, a list
   * reordering, a column toggling its width), interpolate between the old
   * and new layout instead of snapping.
   *
   * - `true` — animate with the library's default spring.
   * - `TransitionConfig` — spring (react-spring vocab) or timing config; the
   *   resolver bridges to Reanimated's `LinearTransition` builder.
   * - omitted / `false` — no layout animation (default).
   *
   * Only `'spring'` / `'timing'` / `'no-animation'` map to layout transitions
   * — decay is downgraded to spring (no clear target). Reduced motion gates
   * the prop the same way it gates `animate`.
   *
   * `layoutId` (below) is a related but distinct mechanism for shared
   * element transitions across screens — `layout` animates this element's
   * own layout changes, `layoutId` animates from a different element's
   * last measured rect to this element's current rect.
   */
  layout?: boolean | TransitionConfig
  /**
   * Shared-element transition id. When a Motion primitive with `layoutId`
   * unmounts, its last on-screen rect is recorded under that id; the next
   * mount of any Motion primitive with the same id animates from the
   * recorded rect to its natural position via a FLIP transform stack.
   *
   * Reanimated 4 removed the `sharedTransitionTag` API — `layoutId` is the
   * Inertia-side measure-based replacement. Rects are recorded in
   * parent-relative coordinates (from `onLayout`), which composes when the
   * source and target screens share an outer content container (the common
   * stack-navigator case); nested-parent layouts need the v2
   * window-coordinate path.
   *
   * The same `transition` prop drives the FLIP animation (spring by
   * default; `'timing'` honored; `'decay'` downgrades to spring; reduced
   * motion skips the transition). Out of scope for the first iteration:
   * style-prop interpolation (border radius, colors, etc.) — only the
   * rect-to-rect transform is animated. Two simultaneously-mounted
   * primitives sharing the same `layoutId` are undefined behavior; pick a
   * primitive per id at a time.
   */
  layoutId?: string
  /**
   * Fired once per logical animation completion. See `AnimationCallbackInfo`
   * for the payload shape — transform parents fire once, not per axis.
   */
  onAnimationEnd?: (info: AnimationCallbackInfo<AnimateStyle<C>>) => void
}

/**
 * Props of a Motion primitive for a given underlying component `C` and a
 * concrete variants map `V`: the component's own props (minus `style`, which
 * we replace with an animated style) intersected with the Motion props.
 */
export type MotionComponentProps<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  C extends ComponentType<any>,
  V extends VariantsMap<ComponentProps<C>> = VariantsMap<ComponentProps<C>>,
> = Omit<ComponentProps<C>, 'style'> &
  MotionProps<ComponentProps<C>, V> & {
    style?: ComponentProps<C>['style']
    ref?: Ref<unknown>
  }

/**
 * The component type produced by `createMotionComponent`.
 *
 * It is a **generic call signature**, not a plain `ComponentType`: the variant
 * map `V` is inferred from the `variants` prop at each JSX use. That inference
 * is what narrows `animate`'s string form to the variant keys, so
 * `<Motion.View variants={{ open, closed }} animate="opne" />` is a compile
 * error and `open` / `closed` autocomplete. With no `variants` prop, `V` falls
 * back to the open `VariantsMap`, so `animate` still accepts any string and the
 * variant-less call site is unchanged.
 */
export interface MotionComponent<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  C extends ComponentType<any>,
> {
  <V extends VariantsMap<ComponentProps<C>> = VariantsMap<ComponentProps<C>>>(
    props: MotionComponentProps<C, V>,
  ): ReactElement | null
  displayName?: string
}
