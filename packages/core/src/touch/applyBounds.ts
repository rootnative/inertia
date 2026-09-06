/**
 * Clamp `value` to `[min, max]`. When `elastic > 0` the overshoot past a
 * bound is scaled by `elastic` instead of hard-clamped, giving a rubber-band
 * feel. `min` / `max` may be `undefined` to leave that side unbounded.
 *
 * Worklet, so it runs both inside a gesture-handler pan handler on the UI
 * thread (`useDrag`) and from a JS-thread `PanResponder` callback
 * (`useTouchDrag`).
 *
 * ```ts
 * applyBounds(120, -100, 100, 0)    // 100
 * applyBounds(120, -100, 100, 0.5)  // 110
 * applyBounds(50, undefined, 100, 0) // 50
 * ```
 */
export function applyBounds(
  value: number,
  min: number | undefined,
  max: number | undefined,
  elastic: number,
): number {
  'worklet'
  if (min !== undefined && value < min) {
    return elastic > 0 ? min + (value - min) * elastic : min
  }
  if (max !== undefined && value > max) {
    return elastic > 0 ? max + (value - max) * elastic : max
  }
  return value
}
