import {
  useAnimatedReaction,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated'
import { scrollEndOf } from '../internal/scrollEnd'

export interface UseHideOnScrollOptions {
  /**
   * The scroll distance, in points, that moves the progress from 0 to 1.
   * Usually the height of the element that hides, so the element moves with
   * the content, one point for one point.
   */
  distance: number
  /**
   * The largest offset that the content can rest at: the content length
   * plus the end inset, minus the viewport length. Movement past it is an
   * overscroll, and does not count. An offset from `useScroll` carries its
   * end already. Pass this for an offset from somewhere else, or to replace
   * that end: on iOS it leaves out the safe-area inset that
   * `contentInsetAdjustmentBehavior="automatic"` adds.
   */
  maxOffset?: SharedValue<number>
}

/**
 * Drive a 0↔1 progress from the direction of a scroll: it rises while the
 * content scrolls down and falls while the content scrolls up, one point of
 * scroll for one point of `distance`. A bar that translates by its own height
 * from this value exits as the user reads on and returns the moment they
 * scroll back, which is the hide-on-scroll pattern of a bottom bar or a
 * floating button.
 *
 * ```tsx
 * const { scrollY, onScroll } = useScroll()
 * const hidden = useHideOnScroll(scrollY, { distance: 80 })
 * const barStyle = useInterpolatedStyle(hidden, { translateY: [0, 80] })
 *
 * return (
 *   <>
 *     <Motion.ScrollView onScroll={onScroll} scrollEventThrottle={16}>
 *       …
 *     </Motion.ScrollView>
 *     <Animated.View style={[styles.bar, barStyle]} />
 *   </>
 * )
 * ```
 *
 * The progress is 0 whenever the offset is at or above the top, so the
 * element is in place at the top of the content and after an overscroll
 * bounce there. Movement past the end of the content does not count, so the
 * iOS bounce at the end leaves a hidden element hidden. `useScroll` records
 * the end for its own offsets; `maxOffset` gives it for any other offset. On
 * iOS, the recorded end leaves out the safe-area inset that
 * `contentInsetAdjustmentBehavior="automatic"` adds, so the last stretch of
 * the content does not count. Pad the content with `contentContainerStyle`
 * instead, or pass `maxOffset`, which replaces the recorded end. The value
 * accumulates and clamps: a long scroll down holds it at 1, and the
 * first scroll up starts to bring it back. It runs on the UI thread, through
 * a reaction on the offset, so it is safe to read from any worklet. It does
 * not snap to 0 or 1 when the scroll stops.
 */
export function useHideOnScroll(
  offset: SharedValue<number>,
  options: UseHideOnScrollOptions,
): SharedValue<number> {
  const { distance, maxOffset } = options
  const end = maxOffset ?? scrollEndOf(offset)
  const progress = useSharedValue(0)
  // The previous offset is kept here, not taken from the reaction's second
  // argument: the Jest mock of `useAnimatedReaction` runs the reaction once
  // per render with no previous value, and the own value makes the hook
  // observable in a test the same way it runs on a device.
  const previous = useSharedValue(offset.value)

  // No dependency list: Reanimated 4.7 warns on native when one is passed,
  // and builds the list from the worklet closure on every platform.
  useAnimatedReaction(
    () => offset.value,
    (offsetValue) => {
      'worklet'
      // An iOS fling that reaches the end bounces past it and back. The
      // bounce back is not a scroll up, so the offset stops at the end.
      const current = end ? Math.min(offsetValue, end.value) : offsetValue
      const delta = current - previous.value
      previous.value = current
      if (current <= 0) {
        progress.value = 0
        return
      }
      progress.value = Math.min(
        1,
        Math.max(0, progress.value + delta / distance),
      )
    },
  )

  return progress
}
