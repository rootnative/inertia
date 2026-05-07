/**
 * Public types for `@onlynative/inertia-gestures`.
 */

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
  onDragEnd?: (info: {
    x: number
    y: number
    velocity: { x: number; y: number }
  }) => void
}
