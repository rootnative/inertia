/**
 * PanResponder-backed drag hook. Lives in core because `PanResponder` is
 * built into React Native — no extra peer dependency. Use this when you
 * need keyboard a11y alongside drag, or when you don't want to take
 * `react-native-gesture-handler` as a dependency.
 *
 * For pointer-only drag in a project that already uses gesture-handler,
 * prefer `useDrag` from `@onlynative/inertia-gestures` — its UI-thread
 * release path is more precise.
 */
export { useTouchDrag } from './useTouchDrag'
export type {
  TouchReleaseInfo,
  TouchReleaseResult,
  TouchReleaseTransition,
  UseTouchDragOptions,
  UseTouchDragResult,
} from './useTouchDrag'
