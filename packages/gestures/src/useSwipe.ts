import { useMemo } from 'react'
import { Gesture, type PanGesture } from 'react-native-gesture-handler'
import {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  type SharedValue,
} from 'react-native-reanimated'

export type SwipeDirection = 'left' | 'right' | 'up' | 'down'

export interface SwipeOptions {
  /**
   * Allowed swipe directions. Defaults to all four. The gesture only commits
   * for directions in this list — a horizontal swipe with `directions:
   * ['up', 'down']` will not fire `onSwipe`.
   */
  directions?: SwipeDirection[]
  /**
   * Pixel distance threshold past which a release commits the swipe. Defaults
   * to `80`.
   */
  distanceThreshold?: number
  /**
   * Velocity threshold (px/sec) past which a release commits the swipe even
   * before the distance threshold is reached — flick-style gestures. Defaults
   * to `800`.
   */
  velocityThreshold?: number
  /**
   * Fired on the JS thread when the gesture commits in an allowed direction.
   */
  onSwipe?: (
    direction: SwipeDirection,
    info: { distance: number; velocity: number },
  ) => void
}

export interface UseSwipeResult {
  /** Pan gesture to pass to a `<GestureDetector>`. */
  gesture: PanGesture
  /**
   * Animated style fragment exposing live translation while the gesture is
   * active. Snaps back to `{ 0, 0 }` after release (whether or not the swipe
   * committed) via a default spring.
   */
  animatedStyle: ReturnType<typeof useAnimatedStyle>
  /** Live x translation. */
  swipeX: SharedValue<number>
  /** Live y translation. */
  swipeY: SharedValue<number>
  /** True while the user is actively swiping. */
  isActive: SharedValue<boolean>
}

const DEFAULT_DIRECTIONS: SwipeDirection[] = ['left', 'right', 'up', 'down']

/**
 * Directional commit-or-snap-back gesture. Tracks live translation while the
 * user drags and fires `onSwipe(direction)` on release if either the distance
 * or velocity threshold is exceeded in an allowed direction. The position
 * shared values always animate back to zero — the consumer is responsible
 * for whatever side effect the commit drives (delete a row, dismiss a sheet,
 * etc.).
 *
 * Usage:
 * ```tsx
 * const swipe = useSwipe({
 *   directions: ['left'],
 *   onSwipe: (dir) => deleteRow(),
 * })
 * return (
 *   <GestureDetector gesture={swipe.gesture}>
 *     <Motion.View style={swipe.animatedStyle}>...</Motion.View>
 *   </GestureDetector>
 * )
 * ```
 */
export function useSwipe(options: SwipeOptions = {}): UseSwipeResult {
  const {
    directions = DEFAULT_DIRECTIONS,
    distanceThreshold = 80,
    velocityThreshold = 800,
    onSwipe,
  } = options

  const swipeX = useSharedValue(0)
  const swipeY = useSharedValue(0)
  const isActive = useSharedValue(false)

  const allowLeft = directions.includes('left')
  const allowRight = directions.includes('right')
  const allowUp = directions.includes('up')
  const allowDown = directions.includes('down')

  const gesture = useMemo(() => {
    const pan = Gesture.Pan()
      .onStart(() => {
        'worklet'
        isActive.value = true
      })
      .onUpdate((e) => {
        'worklet'
        swipeX.value = e.translationX
        swipeY.value = e.translationY
      })
      .onEnd((e) => {
        'worklet'
        isActive.value = false
        const direction = pickDirection(
          e.translationX,
          e.translationY,
          e.velocityX,
          e.velocityY,
          distanceThreshold,
          velocityThreshold,
          allowLeft,
          allowRight,
          allowUp,
          allowDown,
        )
        if (direction !== null && onSwipe) {
          const isHoriz = direction === 'left' || direction === 'right'
          const distance = isHoriz
            ? Math.abs(e.translationX)
            : Math.abs(e.translationY)
          const velocity = isHoriz
            ? Math.abs(e.velocityX)
            : Math.abs(e.velocityY)
          runOnJS(onSwipe)(direction, { distance, velocity })
        }
        swipeX.value = withSpring(0)
        swipeY.value = withSpring(0)
      })
      .onFinalize(() => {
        'worklet'
        isActive.value = false
      })
    return pan
  }, [
    distanceThreshold,
    velocityThreshold,
    allowLeft,
    allowRight,
    allowUp,
    allowDown,
    onSwipe,
    swipeX,
    swipeY,
    isActive,
  ])

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: swipeX.value }, { translateY: swipeY.value }],
  }))

  return { gesture, animatedStyle, swipeX, swipeY, isActive }
}

/**
 * Decide which (allowed) direction a release commits to, based on the larger
 * axis of motion. Returns `null` if neither distance nor velocity threshold
 * is met along the dominant axis or if that direction is disallowed.
 *
 * Worklet — runs on the UI thread inside the pan handler.
 */
function pickDirection(
  tx: number,
  ty: number,
  vx: number,
  vy: number,
  distanceThreshold: number,
  velocityThreshold: number,
  allowLeft: boolean,
  allowRight: boolean,
  allowUp: boolean,
  allowDown: boolean,
): SwipeDirection | null {
  'worklet'
  const absX = Math.abs(tx)
  const absY = Math.abs(ty)
  if (absX >= absY) {
    const meets = absX >= distanceThreshold || Math.abs(vx) >= velocityThreshold
    if (!meets) return null
    if (tx < 0 && allowLeft) return 'left'
    if (tx > 0 && allowRight) return 'right'
    return null
  }
  const meets = absY >= distanceThreshold || Math.abs(vy) >= velocityThreshold
  if (!meets) return null
  if (ty < 0 && allowUp) return 'up'
  if (ty > 0 && allowDown) return 'down'
  return null
}
