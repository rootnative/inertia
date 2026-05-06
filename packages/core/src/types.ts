import { type ComponentType } from 'react'
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

export interface TimingTransition {
  type: 'timing'
  duration?: number
  easing?: (t: number) => number
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

export type Transition<S> = TransitionConfig | PerPropertyTransition<S>

/**
 * The animation state shape inferred from the underlying component's style
 * prop. We narrow to the value side of `style` so consumers see ViewStyle on
 * `Motion.View`, TextStyle on `Motion.Text`, etc. — no shared union.
 */
export type AnimateStyle<C> = C extends { style?: StyleProp<infer S> }
  ? { [K in keyof S]?: AnimatableValue<S[K]> }
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
 * - `focused` — active while a focusable component owns keyboard focus
 *   (no-op for non-focusable underlying components).
 * - `hovered` — web-only. Typed for cross-platform call sites; the runtime is
 *   a no-op on native.
 *
 * When a sub-state is active, its values override the base `animate` target
 * per-property. Priority on overlap: `pressed` > `focused` > `hovered`.
 */
export interface GestureSubStates<C> {
  pressed?: AnimateStyle<C>
  focused?: AnimateStyle<C>
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
 */
export interface MotionProps<C> {
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
   * supplied), or an array of sequence steps. Variant keys autocomplete when
   * `variants` is annotated `as const`.
   */
  animate?: AnimateStyle<C> | string
  /**
   * Values applied while the component exits via `<Presence>`.
   */
  exit?: AnimateStyle<C>
  /**
   * Named animation states. With `variants` set, `animate` accepts a key from
   * this map.
   */
  variants?: VariantsMap<C>
  /**
   * Imperative controller from `useVariants(...)`. When supplied, `animate`
   * is read from `controller.current` and re-applied whenever the controller
   * transitions. `animate` and `controller` should not both be set.
   */
  controller?: VariantController
  /**
   * Gesture-driven sub-states (`pressed`, `focused`, `hovered`). When omitted,
   * no handlers are mounted on the underlying component. Sub-state values
   * merge over `animate` per-property while the corresponding gesture is
   * active.
   */
  gesture?: GestureSubStates<C>
  /**
   * Per-property or top-level transition config. Per-property entries take
   * precedence over the top-level transition.
   */
  transition?: Transition<AnimateStyle<C>>
  /**
   * Fired once per logical animation completion. See `AnimationCallbackInfo`
   * for the payload shape — transform parents fire once, not per axis.
   */
  onAnimationEnd?: (info: AnimationCallbackInfo<AnimateStyle<C>>) => void
}

/**
 * The component type produced by `createMotionComponent`. Combines the
 * underlying component's props (minus `style`, which we replace with an
 * animated style) with the Motion-specific props above.
 */
export type MotionComponent<C extends ComponentType<any>> = ComponentType<
  Omit<React.ComponentProps<C>, 'style'> &
    MotionProps<React.ComponentProps<C>> & {
      style?: React.ComponentProps<C>['style']
    }
>
