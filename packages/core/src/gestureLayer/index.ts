/**
 * Opt-in subpath: `@rootnative/inertia/gesture-layer`.
 *
 * `useGestureLayer` is a generic interactive-feedback primitive that sits one
 * step above `useGesture()` — consumer supplies per-state target values; the
 * hook handles "strongest active layer wins" composition (clamped-max for
 * numerics, priority cascade for colors), the worklet, and the transition.
 *
 * Reach for it when MD3 state-layer haloes, iOS-translucent overlays, or
 * any "highest engaged state controls the overlay" pattern shows up. For
 * composition models this hook doesn't express (additive, multiply, custom
 * per-key blends), drop to `useGesture()` and write a `useAnimatedStyle`
 * block by hand.
 */
export { useGestureLayer } from './useGestureLayer'
export type {
  GestureLayerStates,
  GestureLayerStyle,
  UseGestureLayerOptions,
  UseGestureLayerResult,
} from './useGestureLayer'
