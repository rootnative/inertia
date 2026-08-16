import { useCallback, useMemo } from 'react'
import { Gesture, type PanGesture } from 'react-native-gesture-handler'
import {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated'
import {
  buildReleaseAnimation,
  resolveNamedTransition,
  useNamedTransitions,
  type TransitionConfig,
  type TransitionName,
} from '@rootnative/inertia'
import type { ReleaseInfo, ReleaseResult, SnapBackTransition } from './types'

declare const __DEV__: boolean

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
   * Transition for the snap-back to zero, given inline or as a registered
   * `TransitionName` from the nearest `<MotionConfig transitions={...}>`.
   * Defaults to the library default spring. The release velocity is passed
   * into a spring automatically (unless the config sets `velocity` itself),
   * so a flick that stops short of the threshold resets with the momentum it
   * had. Decay is excluded — the snap-back always targets zero, and decay has
   * no target; a name that resolves to a decay config dev-warns and falls
   * back to the default spring.
   */
  releaseTransition?: SnapBackTransition | TransitionName
  /**
   * Fired on the JS thread when the gesture commits in an allowed direction.
   */
  onSwipe?: (
    direction: SwipeDirection,
    info: { distance: number; velocity: number },
  ) => void
  /**
   * UI-thread callback fired when the gesture commits, before any release
   * animation starts. Return per-axis release transitions to run **instead
   * of** the snap-back — the commit-exit path a card deck needs, where the
   * committed card continues in the swipe direction and leaves the screen:
   *
   * ```ts
   * onCommit: (direction, info) => {
   *   'worklet'
   *   return {
   *     x: {
   *       type: 'spring',
   *       to: direction === 'right' ? 500 : -500,
   *       velocity: info.velocity.x,
   *     },
   *   }
   * }
   * ```
   *
   * An omitted axis (or a `void` return) snaps back to zero as usual. This
   * callback runs as a worklet so the release velocity stays on the UI
   * thread — author it with the `'worklet'` directive at the top of the body.
   *
   * Composes with `onSwipe`: both fire on commit. `onCommit` picks the
   * release animation on the UI thread; `onSwipe` is for JS-thread side
   * effects. Note the shared values stay at the exit target afterwards — call
   * `reset()` when the next card takes over without a remount.
   */
  onCommit?: (
    direction: SwipeDirection,
    info: ReleaseInfo,
  ) => ReleaseResult | void
  /**
   * Fired on the JS thread when a committed swipe's release animation
   * settles — the commit exit from `onCommit` if one ran, the snap-back
   * otherwise. This is the "card is gone, advance the deck" moment that
   * `onSwipe` (which fires at release) cannot give you. `finished` is `false`
   * when the animation was interrupted (for example by a new gesture). Does
   * not fire for a release that did not commit.
   */
  onSwipeEnd?: (direction: SwipeDirection, info: { finished: boolean }) => void
}

export interface UseSwipeResult {
  /** Pan gesture to pass to a `<GestureDetector>`. */
  gesture: PanGesture
  /**
   * Animated style fragment exposing live translation while the gesture is
   * active. After release it snaps back to `{ 0, 0 }` via `releaseTransition`
   * (default spring), unless a committed swipe's `onCommit` returned a
   * commit-exit transition for that axis.
   *
   * This owns the whole `transform` style key. `transform` is one key in React
   * Native, so a second style in the same array **replaces** this array rather
   * than merging with it — `style={[swipe.animatedStyle, tiltStyle]}` silently
   * drops the translation and only the tilt runs. To add a transform of your
   * own, nest another animated view, or build one style from `swipeX` /
   * `swipeY` yourself with `useInterpolatedStyle`.
   */
  animatedStyle: ReturnType<typeof useAnimatedStyle>
  /** Live x translation. */
  swipeX: SharedValue<number>
  /** Live y translation. */
  swipeY: SharedValue<number>
  /** True while the user is actively swiping. */
  isActive: SharedValue<boolean>
  /**
   * Snap both shared values back to zero with no animation, cancelling
   * anything in flight. After a commit exit the values stay at the exit
   * target — call this when the next card takes over the same mounted
   * component. A keyed remount gets fresh values and doesn't need it.
   */
  reset: () => void
}

const DEFAULT_DIRECTIONS: SwipeDirection[] = ['left', 'right', 'up', 'down']

const DEFAULT_SNAP_BACK: TransitionConfig = { type: 'spring' }

/**
 * Directional commit-or-snap-back gesture. Tracks live translation while the
 * user drags and fires `onSwipe(direction)` on release if either the distance
 * or velocity threshold is exceeded in an allowed direction.
 *
 * By default the position shared values animate back to zero whether or not
 * the swipe commits — the right shape for swipe-to-delete, where the row
 * returns and the consumer removes it. For a card deck, return a commit-exit
 * transition from `onCommit` so the committed card continues off screen, and
 * advance the deck from `onSwipeEnd` when it settles.
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
 *
 * `animatedStyle` owns the whole `transform` key, so it does not compose with
 * a second transform style. To add rotation — the usual card-deck shape —
 * build one style from `swipeX` instead of stacking two:
 *
 * ```tsx
 * const cardStyle = useInterpolatedStyle(swipe.swipeX, {
 *   translateX: [-200, 0, 200],
 *   rotate: ['-12deg', '0deg', '12deg'],
 * })
 * return (
 *   <GestureDetector gesture={swipe.gesture}>
 *     <Motion.View style={cardStyle}>...</Motion.View>
 *   </GestureDetector>
 * )
 * ```
 */
export function useSwipe(options: SwipeOptions = {}): UseSwipeResult {
  const {
    directions = DEFAULT_DIRECTIONS,
    distanceThreshold = 80,
    velocityThreshold = 800,
    releaseTransition,
    onSwipe,
    onCommit,
    onSwipeEnd,
  } = options

  const swipeX = useSharedValue(0)
  const swipeY = useSharedValue(0)
  const isActive = useSharedValue(false)

  const allowLeft = directions.includes('left')
  const allowRight = directions.includes('right')
  const allowUp = directions.includes('up')
  const allowDown = directions.includes('down')

  // Resolve a named snap-back on the JS thread, at the nearest provider —
  // the worklet captures the resolved plain config.
  const registry = useNamedTransitions()
  const snapBack = useMemo(() => {
    const cfg =
      resolveNamedTransition(releaseTransition, registry) ?? DEFAULT_SNAP_BACK
    if (cfg.type === 'decay') {
      if (__DEV__) {
        console.warn(
          '[inertia] useSwipe `releaseTransition` resolved to a decay ' +
            'transition, which has no target and cannot snap back to zero — ' +
            'falling back to the default spring.',
        )
      }
      return DEFAULT_SNAP_BACK
    }
    return cfg
  }, [releaseTransition, registry])

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

        // A commit may return per-axis exit transitions to run instead of
        // the snap-back; any axis it leaves out snaps back as usual.
        let exit: ReleaseResult | void = undefined
        if (direction !== null && onCommit) {
          exit = onCommit(direction, {
            x: swipeX.value,
            y: swipeY.value,
            velocity: { x: e.velocityX, y: e.velocityY },
          })
        }

        // `onSwipeEnd` rides the settle callback of the swipe axis — the one
        // animation whose end means "the card has arrived".
        let settle: ((finished?: boolean) => void) | undefined
        if (direction !== null && onSwipeEnd) {
          const dir = direction
          const end = onSwipeEnd
          settle = (finished?: boolean) => {
            runOnJS(end)(dir, { finished: finished === true })
          }
        }
        const isHorizontalCommit = direction === 'left' || direction === 'right'
        const settleX = isHorizontalCommit ? settle : undefined
        const settleY = isHorizontalCommit ? undefined : settle

        const exitX = exit ? exit.x : undefined
        const exitY = exit ? exit.y : undefined
        // Decay ignores its target (it has no `to`); the other types animate
        // to `to`. The snap-back injects the release velocity so a spring
        // reset continues the finger's momentum.
        if (exitX) {
          swipeX.value = buildReleaseAnimation(
            exitX,
            'to' in exitX ? exitX.to : swipeX.value,
            settleX,
          ) as unknown as number
        } else {
          swipeX.value = buildReleaseAnimation(
            withReleaseVelocity(snapBack, e.velocityX),
            0,
            settleX,
          ) as unknown as number
        }
        if (exitY) {
          swipeY.value = buildReleaseAnimation(
            exitY,
            'to' in exitY ? exitY.to : swipeY.value,
            settleY,
          ) as unknown as number
        } else {
          swipeY.value = buildReleaseAnimation(
            withReleaseVelocity(snapBack, e.velocityY),
            0,
            settleY,
          ) as unknown as number
        }
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
    snapBack,
    onSwipe,
    onCommit,
    onSwipeEnd,
    swipeX,
    swipeY,
    isActive,
  ])

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: swipeX.value }, { translateY: swipeY.value }],
  }))

  const reset = useCallback(() => {
    swipeX.value = 0
    swipeY.value = 0
  }, [swipeX, swipeY])

  return { gesture, animatedStyle, swipeX, swipeY, isActive, reset }
}

/**
 * Inject the release velocity into a spring snap-back so the reset continues
 * the finger's momentum. Leaves every other transition type — and a spring
 * whose config already sets `velocity` — untouched.
 *
 * Worklet — runs on the UI thread inside the pan handler.
 */
function withReleaseVelocity(
  cfg: TransitionConfig,
  velocity: number,
): TransitionConfig {
  'worklet'
  // An omitted `type` means spring — the library default everywhere.
  if (cfg.type !== 'spring' && cfg.type !== undefined) return cfg
  if (cfg.velocity !== undefined) return cfg
  return { ...cfg, velocity }
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
