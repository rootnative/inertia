import type { TransitionConfig } from '@rootnative/inertia'

/**
 * Animatable target snapshot for a `MotionSvg.Path`. Every field is optional
 * — include only the dimensions you want to animate; the rest fall back to
 * the static props on the component.
 *
 * `d` morphs the path geometry. The target path **must produce the same
 * command sequence** as the source after implicit-repeat expansion (same
 * letters in the same order, e.g. `M L L L Z`). Element-wise numeric
 * interpolation is the morphing model — see `parsePathD` for the
 * normalization rules.
 */
export interface PathAnimate {
  d?: string
  fill?: string
  stroke?: string
  strokeWidth?: number
  strokeOpacity?: number
  fillOpacity?: number
  opacity?: number
  strokeDashoffset?: number
}

/** The animatable dimensions of a `MotionSvg.Path`. */
export type PathStateShape = {
  [K in keyof Required<PathAnimate>]: PathAnimate[K]
}

/**
 * Per-property transition map. Top-level entries on `transition` apply to all
 * properties unless overridden by a per-key entry here.
 */
export type PathPerPropertyTransition = {
  [K in keyof PathStateShape]?: TransitionConfig
}

/**
 * Transition shape accepted by `MotionSvg.Path`. Either a single top-level
 * transition applied to every animated dimension, or a per-property map.
 */
export type PathTransition = TransitionConfig | PathPerPropertyTransition
