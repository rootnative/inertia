import {
  useAnimatedScrollHandler,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated'
import { type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native'
import { registerScrollEnd } from '../internal/scrollEnd'

export interface UseScrollResult {
  /** Horizontal scroll offset in points. */
  scrollX: SharedValue<number>
  /** Vertical scroll offset in points. */
  scrollY: SharedValue<number>
  /**
   * The largest horizontal offset that the content can rest at, in points:
   * the content width plus the right inset, minus the viewport width. It is
   * `Infinity` until the first scroll event. Read it, do not write it.
   */
  maxScrollX: SharedValue<number>
  /**
   * The largest vertical offset that the content can rest at, in points:
   * the content height plus the bottom inset, minus the viewport height. It
   * is `Infinity` until the first scroll event. Read it, do not write it.
   */
  maxScrollY: SharedValue<number>
  /**
   * Handler to pass to the `onScroll` prop of `Motion.ScrollView` or
   * `Motion.FlatList` (or any other Reanimated animated scroller). The handler
   * is opaque to JS — it runs as a worklet — but the type narrows to the same
   * shape RN's native `onScroll` prop expects so it composes cleanly.
   */
  onScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => void
}

/**
 * Track the scroll offset of a `Motion.ScrollView` as shared values.
 *
 * ```tsx
 * const { scrollY, onScroll } = useScroll()
 * const headerOpacity = useTransform(scrollY, [0, 100], [1, 0])
 * const headerStyle = useAnimatedStyle(() => ({
 *   opacity: headerOpacity.value,
 * }))
 *
 * return (
 *   <>
 *     <Animated.View style={headerStyle} />
 *     <Motion.ScrollView onScroll={onScroll} scrollEventThrottle={16}>
 *       …
 *     </Motion.ScrollView>
 *   </>
 * )
 * ```
 *
 * The derived shared values are consumed through Reanimated interop
 * (`useAnimatedStyle` / `useDerivedValue`) — the declarative `animate` prop
 * takes target values, not shared values.
 *
 * Scroll events fire on the UI thread, so `scrollX` / `scrollY` are safe to
 * read from any worklet (`useAnimatedStyle`, `useDerivedValue`,
 * `useTransform`) without a JS-thread bounce.
 *
 * `maxScrollX` / `maxScrollY` give the end of the content. An offset past it
 * is an overscroll, as in the iOS bounce at the end of a list, so clamp the
 * offset to it to read the bounce back as a rest and not as a scroll up:
 *
 * ```tsx
 * const { scrollY, maxScrollY, onScroll } = useScroll()
 * const restingY = useDerivedValue(() =>
 *   Math.min(scrollY.value, maxScrollY.value),
 * )
 * ```
 *
 * Each scroll event updates the end, so a change of the content size shows
 * at the next scroll event. On iOS, the end leaves out the safe-area inset
 * that `contentInsetAdjustmentBehavior="automatic"` adds: the event does not
 * carry it.
 *
 * Remember to set `scrollEventThrottle={16}` on a `Motion.ScrollView` for 60Hz
 * updates — RN's default is to dispatch on every event, which on iOS still
 * means one per frame, but Android benefits from the explicit cap.
 *
 * `Motion.FlatList` needs no such setting — it defaults `scrollEventThrottle`
 * to 1 for you. Prefer it over `Motion.ScrollView` for long or unbounded lists:
 * it virtualizes, and both accept this handler.
 */
export function useScroll(): UseScrollResult {
  const scrollX = useSharedValue(0)
  const scrollY = useSharedValue(0)
  // The end is unknown until the first scroll event, so nothing clamps
  // before it.
  const maxScrollX = useSharedValue(Infinity)
  const maxScrollY = useSharedValue(Infinity)
  registerScrollEnd(scrollX, maxScrollX)
  registerScrollEnd(scrollY, maxScrollY)

  const handler = useAnimatedScrollHandler({
    onScroll: (event) => {
      'worklet'
      // The ends are written before the offsets, because a reaction on an
      // offset reads them. A test event can carry the offset alone.
      if (event.contentSize && event.layoutMeasurement) {
        const insetRight = event.contentInset?.right ?? 0
        const insetBottom = event.contentInset?.bottom ?? 0
        maxScrollX.value = Math.max(
          0,
          event.contentSize.width + insetRight - event.layoutMeasurement.width,
        )
        maxScrollY.value = Math.max(
          0,
          event.contentSize.height +
            insetBottom -
            event.layoutMeasurement.height,
        )
      }
      scrollX.value = event.contentOffset.x
      scrollY.value = event.contentOffset.y
    },
  })

  // `useAnimatedScrollHandler` returns an opaque worklet bag whose JS-side
  // type is `(event) => void` but actually carries native event-handler
  // wiring. Cast through `unknown` because the public RN `onScroll` type
  // wants a `NativeSyntheticEvent`-taking function and Reanimated's handler
  // is structurally compatible — the cast is to satisfy the consumer's
  // prop type at the call site.
  return {
    scrollX,
    scrollY,
    maxScrollX,
    maxScrollY,
    onScroll: handler as unknown as (
      event: NativeSyntheticEvent<NativeScrollEvent>,
    ) => void,
  }
}
