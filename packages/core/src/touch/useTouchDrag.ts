import { useMemo } from 'react'
import {
  PanResponder,
  type PanResponderGestureState,
  type PanResponderInstance,
} from 'react-native'
import {
  useAnimatedStyle,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated'
import { buildReleaseAnimation } from '../transitions'
import type { TransitionConfig } from '../types'

/**
 * Same drag-result shape as `useDrag` from `@onlynative/inertia-gestures`,
 * minus the `gesture` field (PanResponder spreads handlers, no
 * `<GestureDetector>` wrapper). The shared values + animatedStyle are
 * interchangeable across both hooks; consumers can swap implementations
 * without touching their `useAnimatedStyle` consumers.
 */
export interface UseTouchDragResult {
  /** Spread onto a `View` / `Pressable` to install the pan responder. */
  panHandlers: PanResponderInstance['panHandlers']
  /** Stable animated `transform` style. */
  animatedStyle: ReturnType<typeof useAnimatedStyle>
  /** Live x translation, persistent across gestures. */
  dragX: SharedValue<number>
  /** Live y translation, persistent across gestures. */
  dragY: SharedValue<number>
  /** True while the gesture is active. */
  isDragging: SharedValue<boolean>
}

/**
 * Release transition shape for PanResponder's JS-thread `onRelease`. Mirrors
 * the gesture-handler adapter's `ReleaseTransition` but with `to` typed as
 * required for spring/timing/no-animation (decay omits it).
 */
export type TouchReleaseTransition =
  | (TransitionConfig & { type: 'spring'; to: number })
  | (TransitionConfig & { type: 'timing'; to: number })
  | (TransitionConfig & { type: 'decay' })
  | (TransitionConfig & { type: 'no-animation'; to: number })

export interface TouchReleaseInfo {
  x: number
  y: number
  velocity: { x: number; y: number }
}

export interface TouchReleaseResult {
  x?: TouchReleaseTransition
  y?: TouchReleaseTransition
}

export interface UseTouchDragOptions {
  /**
   * Restrict the drag to one axis. Defaults to `'both'`. When `'x'` is set
   * the y-axis shared value never updates (and vice versa); velocity is
   * still reported on both for `onDragEnd`.
   */
  axis?: 'x' | 'y' | 'both'
  /**
   * Travel bounds (px from resting). Each side is independently optional.
   * Out-of-bounds values clamp to the limit unless `elastic > 0`.
   */
  constraints?: {
    left?: number
    right?: number
    top?: number
    bottom?: number
  }
  /**
   * Rubber-band coefficient applied to overshoot past `constraints`. `0`
   * (default) hard-clamps; `0.2`-`0.4` is a typical Framer-Motion feel.
   */
  elastic?: number
  /**
   * Fires when the user starts dragging. JS thread.
   */
  onDragStart?: () => void
  /**
   * Fires when the user releases or the gesture terminates. JS thread.
   *
   * Velocity is in px/sec to match the `@onlynative/inertia-gestures` API
   * (PanResponder's native `vx` / `vy` are px/ms; the hook normalizes).
   */
  onDragEnd?: (info: TouchReleaseInfo) => void
  /**
   * Optional release-animation callback. Return per-axis release transitions
   * to animate the SVs to a settled position via Inertia's transition
   * resolver — spring snap-to-tick, decay with bounds, timing settle.
   *
   * Unlike the gesture-handler version, this callback runs on the **JS
   * thread** (PanResponder is JS-only). The returned transitions still drive
   * UI-thread animations via Reanimated — only the decision logic is JS-side.
   */
  onRelease?: (info: TouchReleaseInfo) => TouchReleaseResult | void
}

/**
 * PanResponder-backed drag hook. Pointer-equivalent of `useDrag` from
 * `@onlynative/inertia-gestures`, with two differences:
 *
 *   1. No `react-native-gesture-handler` peer dep required — PanResponder is
 *      built into React Native, so this lives in core.
 *   2. Returns `panHandlers` to spread on a `View` / `Pressable` instead of
 *      a `gesture` to plug into `<GestureDetector>`.
 *
 * Use this when:
 *   - You need keyboard a11y alongside drag (a slider with arrow-key step,
 *     a scrollbar with `PageUp` / `PageDown`). PanResponder composes
 *     cleanly with `onKeyDown`; gesture-handler doesn't surface keyboard.
 *   - You don't want to take `react-native-gesture-handler` as a dependency
 *     (smaller bundle, simpler install).
 *
 * Skip this when:
 *   - You're already using `react-native-gesture-handler` elsewhere (use
 *     `useDrag` from `@onlynative/inertia-gestures` for consistency and
 *     better worklet-thread fidelity on release velocity).
 *   - You need momentum semantics like the gesture-handler `usePan` —
 *     PanResponder's release velocity is JS-thread and slightly less precise.
 *
 * @example
 * ```tsx
 * import { useTouchDrag } from '@onlynative/inertia/touch'
 *
 * function Slider({ ticks }: { ticks: number[] }) {
 *   const drag = useTouchDrag({
 *     axis: 'x',
 *     constraints: { left: 0, right: 280 },
 *     onRelease: (e) => {
 *       const snap = nearestTick(e.x, ticks)
 *       return { x: { type: 'spring', to: snap, velocity: e.velocity.x } }
 *     },
 *   })
 *
 *   return (
 *     <Motion.View
 *       style={[styles.thumb, drag.animatedStyle]}
 *       {...drag.panHandlers}
 *     />
 *   )
 * }
 * ```
 */
export function useTouchDrag(
  options: UseTouchDragOptions = {},
): UseTouchDragResult {
  const { axis = 'both', constraints, elastic = 0 } = options

  const dragX = useSharedValue(0)
  const dragY = useSharedValue(0)
  const startX = useSharedValue(0)
  const startY = useSharedValue(0)
  const isDragging = useSharedValue(false)

  // Snapshot scalars into local consts so the responder callbacks close over
  // primitives, not the `options` literal — a fresh `options` each render
  // would otherwise force the PanResponder identity to change.
  const lockX = axis !== 'y'
  const lockY = axis !== 'x'
  const left = constraints?.left
  const right = constraints?.right
  const top = constraints?.top
  const bottom = constraints?.bottom
  const elasticCoef = elastic
  const { onDragStart, onDragEnd, onRelease } = options

  const responder = useMemo(
    () => buildResponder(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      lockX,
      lockY,
      left,
      right,
      top,
      bottom,
      elasticCoef,
      onDragStart,
      onDragEnd,
      onRelease,
    ],
  )

  // Hoisted out of the inline `useMemo` factory to keep the dep list readable
  // and avoid re-declaring closure helpers each render.
  function buildResponder(): PanResponderInstance {
    const handleEnd = (g: PanResponderGestureState) => {
      isDragging.value = false
      const x = dragX.value
      const y = dragY.value
      // PanResponder velocity is px/ms; multiply to match the
      // `@onlynative/inertia-gestures` API (px/sec from gesture-handler).
      const vx = g.vx * 1000
      const vy = g.vy * 1000
      if (onRelease) {
        const result = onRelease({ x, y, velocity: { x: vx, y: vy } })
        if (result) {
          if (result.x && lockX) {
            const toX = 'to' in result.x ? result.x.to : x
            dragX.value = buildReleaseAnimation(
              result.x,
              toX,
            ) as unknown as number
          }
          if (result.y && lockY) {
            const toY = 'to' in result.y ? result.y.to : y
            dragY.value = buildReleaseAnimation(
              result.y,
              toY,
            ) as unknown as number
          }
        }
      }
      if (onDragEnd) onDragEnd({ x, y, velocity: { x: vx, y: vy } })
    }

    return PanResponder.create({
      // Always claim the start so taps that turn into drags don't slip
      // through to a parent ScrollView. Consumers can compose their own
      // capture predicates by wrapping the returned `panHandlers`.
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        startX.value = dragX.value
        startY.value = dragY.value
        isDragging.value = true
        if (onDragStart) onDragStart()
      },
      onPanResponderMove: (_e, g) => {
        if (lockX) {
          dragX.value = applyBounds(
            startX.value + g.dx,
            left,
            right,
            elasticCoef,
          )
        }
        if (lockY) {
          dragY.value = applyBounds(
            startY.value + g.dy,
            top,
            bottom,
            elasticCoef,
          )
        }
      },
      onPanResponderRelease: (_e, g) => handleEnd(g),
      onPanResponderTerminate: (_e, g) => handleEnd(g),
    })
  }

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: dragX.value }, { translateY: dragY.value }],
  }))

  return {
    panHandlers: responder.panHandlers,
    animatedStyle,
    dragX,
    dragY,
    isDragging,
  }
}

/**
 * Clamp `value` to `[min, max]`. When `elastic > 0` the overshoot past a
 * bound is scaled by `elastic`, giving a rubber-band feel. `min` / `max`
 * may be `undefined` to leave that side unbounded.
 *
 * JS-thread (PanResponder callbacks are JS, not worklets).
 */
function applyBounds(
  value: number,
  min: number | undefined,
  max: number | undefined,
  elastic: number,
): number {
  if (min !== undefined && value < min) {
    return elastic > 0 ? min + (value - min) * elastic : min
  }
  if (max !== undefined && value > max) {
    return elastic > 0 ? max + (value - max) * elastic : max
  }
  return value
}
