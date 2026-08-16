/**
 * `@rootnative/inertia-gestures` — gesture-handler-driven adapters for
 * `@rootnative/inertia`.
 *
 * Public surface:
 * - `useDrag` — one- or two-axis drag with optional constraints and
 *   rubber-band elasticity.
 * - `useSwipe` — directional commit-or-snap-back gesture (distance + velocity
 *   thresholds), with a configurable snap-back and an optional commit-exit
 *   path for card decks.
 * - `usePan` — camera-style pan with momentum on release.
 */
export { useDrag } from './useDrag'
export type { UseDragResult } from './useDrag'
export { useSwipe } from './useSwipe'
export type { SwipeDirection, SwipeOptions, UseSwipeResult } from './useSwipe'
export { usePan } from './usePan'
export type { PanOptions, UsePanResult } from './usePan'
export type {
  DragConstraints,
  DragOptions,
  ReleaseInfo,
  ReleaseResult,
  ReleaseTransition,
  SnapBackTransition,
} from './types'
