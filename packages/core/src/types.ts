import { type ComponentType } from 'react'
import { type StyleProp } from 'react-native'

/**
 * A single animation step's destination, optionally overriding the transition
 * for that step.
 */
export type SequenceStep<V> =
  | V
  | ({ to: V; delay?: number } & TransitionConfig)

/**
 * A target value for an animatable property: a single value, a sequence of
 * steps (keyframes), or a single step object.
 */
export type AnimatableValue<V> = V | SequenceStep<V> | ReadonlyArray<SequenceStep<V>>

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
  key: keyof S
  finished: boolean
  value: unknown
  target: unknown
  phase: 'step' | 'sequence' | 'repeat' | 'animation'
  step: number | undefined
  iteration: number
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
   * The animation target. May be a single state object, a variant key (when
   * `variants` is supplied), or an array of sequence steps.
   */
  animate?: AnimateStyle<C>
  /**
   * Values applied while the component exits via `<Presence>`.
   */
  exit?: AnimateStyle<C>
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
