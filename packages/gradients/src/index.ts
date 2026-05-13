/**
 * `@onlynative/inertia-gradients` — animated gradient primitives for
 * `@onlynative/inertia`.
 *
 * v0.2 surface:
 * - `MotionLinearGradient` — animatable linear gradient over
 *   `expo-linear-gradient`. Animates `colors`, `start`, `end`, and
 *   `locations` with the same `initial` / `animate` / `transition` shape
 *   as the core Motion primitives.
 *
 * Radial / conic gradients land in v0.3 once the linear API is validated.
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
