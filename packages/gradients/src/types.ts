import type { TransitionConfig } from '@rootnative/inertia'

/**
 * A 2D point on the gradient's `[0, 1]` square. `{ x: 0, y: 0 }` is the
 * top-left corner; `{ x: 1, y: 1 }` is the bottom-right.
 */
export interface GradientPoint {
  x: number
  y: number
}

/**
 * Animatable target snapshot for a linear gradient. Every field is optional —
 * include only the dimensions you want to animate; the rest fall back to the
 * static props on the component.
 *
 * `colors` and `locations` arrays must keep the same length as the static
 * `colors` prop. Slot count is locked at first render so the shared-value
 * table is stable across the animation's lifetime.
 */
export interface LinearGradientAnimate {
  colors?: readonly string[]
  start?: GradientPoint
  end?: GradientPoint
  locations?: readonly number[]
}

/**
 * The four animatable dimensions of a linear gradient. Per-key transitions on
 * `transition` are keyed against this shape.
 */
export interface LinearGradientStateShape {
  colors: readonly string[]
  start: GradientPoint
  end: GradientPoint
  locations: readonly number[]
}

/**
 * Per-property transition map. Top-level entries on `transition` apply to all
 * properties unless overridden by a per-key entry here.
 */
export type LinearGradientPerPropertyTransition = {
  [K in keyof LinearGradientStateShape]?: TransitionConfig
}

/**
 * Transition shape accepted by `MotionLinearGradient`. Either a single
 * top-level transition applied to every animated dimension, or a per-property
 * map.
 */
export type LinearGradientTransition =
  | TransitionConfig
  | LinearGradientPerPropertyTransition
