import { useMemo } from 'react'
import { Gesture, type PanGesture } from 'react-native-gesture-handler'
import {
  useAnimatedStyle,
  useSharedValue,
  withDecay,
  type SharedValue,
} from 'react-native-reanimated'
import type { DragConstraints } from './types'

export interface PanOptions {
  /**
   * Translation bounds. Each side is optional; out-of-bounds motion during
   * the active gesture and during the post-release decay is hard-clamped
   * (Reanimated's `withDecay` `clamp` param). Decay-style overshoot is not
   * supported here — for rubber-banded bounds, prefer `useDrag` with
   * `elastic`.
   */
  constraints?: DragConstraints
  /**
   * Deceleration applied to the post-release momentum. Higher = momentum
   * dies faster. Reanimated default is `0.998`; lower values feel more
   * "slippy". Range: roughly `0.99` (slow) to `0.999` (long glide).
   */
  deceleration?: number
  /**
   * Disable the post-release momentum entirely. Defaults to `false` — pan
   * coasts after release. Set to `true` for a hard stop on release (drag-like
   * behavior).
   */
  disableMomentum?: boolean
}

export interface UsePanResult {
  /** Pan gesture to pass to a `<GestureDetector>`. */
  gesture: PanGesture
  /** Stable animated `transform` style. */
  animatedStyle: ReturnType<typeof useAnimatedStyle>
  /** Live x translation, persistent across gestures. */
  panX: SharedValue<number>
  /** Live y translation, persistent across gestures. */
  panY: SharedValue<number>
  /** True while the user is actively panning. Decay phase reads `false`. */
  isPanning: SharedValue<boolean>
}

/**
 * Camera-pan-style drag with momentum on release. Translation persists
 * across separate pan gestures (the next pan starts from the current
 * position, not zero), and on release the translation continues to glide
 * via Reanimated's `withDecay` until friction stops it.
 *
 * Use for map / zoom-canvas / large-image navigation. For dragging an
 * element to a position with no momentum, use `useDrag` instead.
 */
export function usePan(options: PanOptions = {}): UsePanResult {
  const { constraints, deceleration, disableMomentum = false } = options

  const panX = useSharedValue(0)
  const panY = useSharedValue(0)
  const startX = useSharedValue(0)
  const startY = useSharedValue(0)
  const isPanning = useSharedValue(false)

  const left = constraints?.left
  const right = constraints?.right
  const top = constraints?.top
  const bottom = constraints?.bottom
  const decel = deceleration

  const gesture = useMemo(() => {
    const pan = Gesture.Pan()
      .onStart(() => {
        'worklet'
        startX.value = panX.value
        startY.value = panY.value
        isPanning.value = true
      })
      .onUpdate((e) => {
        'worklet'
        panX.value = clamp(startX.value + e.translationX, left, right)
        panY.value = clamp(startY.value + e.translationY, top, bottom)
      })
      .onEnd((e) => {
        'worklet'
        isPanning.value = false
        if (disableMomentum) return
        const clampX = boundsTuple(left, right)
        const clampY = boundsTuple(top, bottom)
        panX.value = withDecay(decayConfig(e.velocityX, decel, clampX))
        panY.value = withDecay(decayConfig(e.velocityY, decel, clampY))
      })
      .onFinalize(() => {
        'worklet'
        isPanning.value = false
      })
    return pan
  }, [
    left,
    right,
    top,
    bottom,
    decel,
    disableMomentum,
    panX,
    panY,
    startX,
    startY,
    isPanning,
  ])

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: panX.value }, { translateY: panY.value }],
  }))

  return { gesture, animatedStyle, panX, panY, isPanning }
}

/**
 * Hard-clamp `value` between `min` and `max`. Either bound may be undefined
 * to leave that side unbounded. Worklet — UI thread.
 */
function clamp(
  value: number,
  min: number | undefined,
  max: number | undefined,
): number {
  'worklet'
  if (min !== undefined && value < min) return min
  if (max !== undefined && value > max) return max
  return value
}

/**
 * Build the `clamp` tuple Reanimated's `withDecay` expects, or `undefined`
 * when the axis is unbounded. `withDecay` requires both ends present, so a
 * one-sided constraint is widened with `±Infinity`.
 */
function boundsTuple(
  min: number | undefined,
  max: number | undefined,
): [number, number] | undefined {
  'worklet'
  if (min === undefined && max === undefined) return undefined
  return [min ?? Number.NEGATIVE_INFINITY, max ?? Number.POSITIVE_INFINITY]
}

function decayConfig(
  velocity: number,
  deceleration: number | undefined,
  clamp: [number, number] | undefined,
) {
  'worklet'
  const cfg: {
    velocity: number
    deceleration?: number
    clamp?: [number, number]
  } = {
    velocity,
  }
  if (deceleration !== undefined) cfg.deceleration = deceleration
  if (clamp !== undefined) cfg.clamp = clamp
  return cfg
}
