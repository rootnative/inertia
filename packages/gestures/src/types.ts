/**
 * Public types for `@rootnative/inertia-gestures`.
 */

import type {
  DecayTransition,
  NoAnimationTransition,
  SpringTransition,
  TimingTransition,
} from '@rootnative/inertia'

/**
 * Bounds the dragged value can reach. Each side is optional — omit to leave
 * that direction unbounded. Coordinates are in the same space the drag
 * publishes (pixels of translation from the dragged element's resting
 * position), so `{ left: -100, right: 100 }` allows ±100 px of horizontal
 * travel.
 */
export interface DragConstraints {
  left?: number
  right?: number
  top?: number
  bottom?: number
}

/**
 * UI-thread payload delivered to `onRelease` when the drag finishes. `x` and
 * `y` are the final translations the SVs are sitting at; `velocity.x` /
 * `velocity.y` are the release velocities in px/sec.
 */
export interface ReleaseInfo {
  x: number
  y: number
  velocity: { x: number; y: number }
}

/**
 * Per-axis release transition. Spring / timing / no-animation animate to a
 * target value (`to`); decay decelerates from the current position via its
 * own physics and has no `to`. Pass the release velocity from `ReleaseInfo`
 * into the transition's own `velocity` field for natural continuation.
 */
export type ReleaseTransition =
  | (SpringTransition & { to: number })
  | (TimingTransition & { to: number })
  | DecayTransition
  | (NoAnimationTransition & { to: number })

/**
 * Per-axis release transitions returned by `onRelease`. Omit an axis to leave
 * its SV where it landed (no release animation on that axis).
 */
export interface ReleaseResult {
  x?: ReleaseTransition
  y?: ReleaseTransition
}

/**
 * Configuration for `useDrag`. All fields are optional; the defaults give an
 * unconstrained two-axis drag with no elasticity.
 */
export interface DragOptions {
  /**
   * Restrict the drag to one axis. Defaults to `'both'`. When `'x'` is set
   * the y-axis shared value never updates (and vice versa); the gesture
   * still tracks both for velocity reporting on `onDragEnd`.
   */
  axis?: 'x' | 'y' | 'both'
  /**
   * Travel bounds. Out-of-bounds values clamp to the limit unless `elastic`
   * is non-zero, in which case overshoot is dampened (rubber-band feel).
   */
  constraints?: DragConstraints
  /**
   * Rubber-band coefficient applied to overshoot past `constraints`. `0`
   * (default) hard-clamps; `1` is fully elastic (no resistance). Typical
   * Framer-Motion-style feel sits around `0.2`–`0.4`.
   */
  elastic?: number
  /**
   * Fired on the JS thread when the drag begins.
   */
  onDragStart?: () => void
  /**
   * Fired on the JS thread when the drag finishes (release or cancel). The
   * payload is the final translation and the release velocity in px/sec.
   */
  onDragEnd?: (info: ReleaseInfo) => void
  /**
   * UI-thread callback fired on release. Return per-axis release transitions
   * to animate the SVs to a settled position via Inertia's transition
   * resolver — spring snap-to-tick, decay with bounds, timing settle, etc.
   * Omit an axis (or return nothing) to leave that SV where it landed.
   *
   * This callback runs as a worklet so the release velocity stays on the UI
   * thread. Author it with the `'worklet'` directive at the top of the body.
   *
   * Composes with `onDragEnd`: both fire on release. `onRelease` controls SV
   * animation on the UI thread; `onDragEnd` is for JS-thread side effects
   * (analytics, state updates).
   */
  onRelease?: (info: ReleaseInfo) => ReleaseResult | void
}
