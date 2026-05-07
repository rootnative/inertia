import { useMemo } from 'react'
import { Gesture, type PanGesture } from 'react-native-gesture-handler'
import {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated'
import type { DragConstraints, DragOptions } from './types'

export interface UseDragResult {
  /** Pan gesture to pass to a `<GestureDetector>`. */
  gesture: PanGesture
  /**
   * Animated style fragment (a single `transform` entry) to stack onto the
   * dragged Motion primitive's `style` prop. Stable across renders.
   */
  animatedStyle: ReturnType<typeof useAnimatedStyle>
  /** Current x translation in pixels. UI-thread shared value. */
  dragX: SharedValue<number>
  /** Current y translation in pixels. UI-thread shared value. */
  dragY: SharedValue<number>
  /** True while the gesture is active. */
  isDragging: SharedValue<boolean>
}

/**
 * Drag a Motion primitive with `react-native-gesture-handler`'s pan gesture.
 *
 * The hook owns a pair of shared values (`dragX`, `dragY`) and a `Pan`
 * gesture that updates them on the UI thread. The returned `animatedStyle`
 * is a self-contained `transform: [{ translateX }, { translateY }]` fragment;
 * stack it onto the dragged component without colliding with Motion's own
 * `animate` transforms.
 *
 * Usage:
 * ```tsx
 * const drag = useDrag({ axis: 'x', constraints: { left: -100, right: 100 } })
 * return (
 *   <GestureDetector gesture={drag.gesture}>
 *     <Motion.View style={drag.animatedStyle} />
 *   </GestureDetector>
 * )
 * ```
 */
export function useDrag(options: DragOptions = {}): UseDragResult {
  const {
    axis = 'both',
    constraints,
    elastic = 0,
    onDragStart,
    onDragEnd,
  } = options

  const dragX = useSharedValue(0)
  const dragY = useSharedValue(0)
  const startX = useSharedValue(0)
  const startY = useSharedValue(0)
  const isDragging = useSharedValue(false)

  // Snapshot scalars into local consts so the Pan handlers (worklets) capture
  // primitives, not the closing `options` object — a fresh `options` literal
  // each render would otherwise force a new gesture identity.
  const lockX = axis !== 'y'
  const lockY = axis !== 'x'
  const left = constraints?.left
  const right = constraints?.right
  const top = constraints?.top
  const bottom = constraints?.bottom
  const elasticCoef = elastic

  const gesture = useMemo(() => {
    const pan = Gesture.Pan()
      .onStart(() => {
        'worklet'
        startX.value = dragX.value
        startY.value = dragY.value
        isDragging.value = true
        if (onDragStart) runOnJS(onDragStart)()
      })
      .onUpdate((e) => {
        'worklet'
        if (lockX) {
          dragX.value = applyBounds(
            startX.value + e.translationX,
            left,
            right,
            elasticCoef,
          )
        }
        if (lockY) {
          dragY.value = applyBounds(
            startY.value + e.translationY,
            top,
            bottom,
            elasticCoef,
          )
        }
      })
      .onEnd((e) => {
        'worklet'
        isDragging.value = false
        if (onDragEnd) {
          const x = dragX.value
          const y = dragY.value
          const vx = e.velocityX
          const vy = e.velocityY
          runOnJS(onDragEnd)({ x, y, velocity: { x: vx, y: vy } })
        }
      })
    return pan
  }, [
    lockX,
    lockY,
    left,
    right,
    top,
    bottom,
    elasticCoef,
    onDragStart,
    onDragEnd,
    dragX,
    dragY,
    startX,
    startY,
    isDragging,
  ])

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: dragX.value }, { translateY: dragY.value }],
  }))

  return { gesture, animatedStyle, dragX, dragY, isDragging }
}

/**
 * Clamp `value` to `[min, max]`. When `elastic > 0` the overshoot beyond a
 * bound is scaled by `elastic` instead of hard-clamped, giving a rubber-band
 * feel. `min` / `max` may be `undefined` to leave that side unbounded.
 *
 * Worklet — runs on the UI thread inside the pan handler.
 */
function applyBounds(
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

export type { DragConstraints, DragOptions }
