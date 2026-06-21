import {
  useAnimatedScrollHandler,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated'
import { type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native'

export interface UseScrollResult {
  /** Horizontal scroll offset in points. */
  scrollX: SharedValue<number>
  /** Vertical scroll offset in points. */
  scrollY: SharedValue<number>
  /**
   * Handler to pass to a `Motion.ScrollView`'s `onScroll` prop (or any other
   * Reanimated `Animated.ScrollView`). The handler is opaque to JS — it runs
   * as a worklet — but the type narrows to the same shape RN's native
   * `onScroll` prop expects so it composes cleanly.
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
 * Remember to set `scrollEventThrottle={16}` on the `ScrollView` for 60Hz
 * updates — RN's default is to dispatch on every event, which on iOS still
 * means one per frame, but Android benefits from the explicit cap.
 */
export function useScroll(): UseScrollResult {
  const scrollX = useSharedValue(0)
  const scrollY = useSharedValue(0)

  const handler = useAnimatedScrollHandler({
    onScroll: (event) => {
      'worklet'
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
    onScroll: handler as unknown as (
      event: NativeSyntheticEvent<NativeScrollEvent>,
    ) => void,
  }
}
