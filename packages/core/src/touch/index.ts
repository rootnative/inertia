/**
 * PanResponder-backed drag hook. Lives in core because `PanResponder` is
 * built into React Native — no extra peer dependency. Use this when you
 * want key steps alongside drag (where the platform sends key events; see
 * `useTouchDrag`), or when you don't want to take
 * `react-native-gesture-handler` as a dependency.
 *
 * For pointer-only drag in a project that already uses gesture-handler,
 * prefer `useDrag` from `@rootnative/inertia-gestures` — its UI-thread
 * release path is more precise.
 */
export { applyBounds } from './applyBounds'
export { useTouchDrag } from './useTouchDrag'
export type {
  TouchReleaseInfo,
  TouchReleaseResult,
  TouchReleaseTransition,
  UseTouchDragOptions,
  UseTouchDragResult,
} from './useTouchDrag'
