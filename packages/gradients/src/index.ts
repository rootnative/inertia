/**
 * `@rootnative/inertia-gradients` — animated gradient primitives for
 * `@rootnative/inertia`.
 *
 * Public surface:
 * - `MotionLinearGradient` — animatable linear gradient over
 *   `expo-linear-gradient`. Animates `colors`, `start`, `end`, and
 *   `locations` with the same `initial` / `animate` / `transition` shape
 *   as the core Motion primitives.
 *
 * Radial / conic gradients are backlog, unscheduled — they need their own
 * prop shape, and the linear API earns that work first.
 */
export { MotionLinearGradient } from './MotionLinearGradient'
export type { MotionLinearGradientProps } from './MotionLinearGradient'
export type {
  GradientPoint,
  LinearGradientAnimate,
  LinearGradientPerPropertyTransition,
  LinearGradientStateShape,
  LinearGradientTransition,
} from './types'
