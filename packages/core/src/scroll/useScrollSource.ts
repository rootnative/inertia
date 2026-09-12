import {
  useCallback,
  useMemo,
  useRef,
  type MutableRefObject,
  type Ref,
} from 'react'
import {
  useAnimatedRef,
  useScrollViewOffset,
  useSharedValue,
} from 'react-native-reanimated'
import { type LayoutChangeEvent } from 'react-native'
import { type ScrollContextValue } from './ScrollContext'

/** The context value plus the two props the container must attach. */
export interface ScrollSource {
  /** Pass to `<ScrollContext.Provider value={…}>`. */
  value: ScrollContextValue
  /** Attach as the container's `ref` — it merges the caller's own ref in. */
  setRef: (node: unknown) => void
  /** Attach as the container's `onLayout` — it calls the caller's own first. */
  onLayout: (event: LayoutChangeEvent) => void
}

/**
 * Backs the scroll context that `Motion.ScrollView` and `Motion.FlatList`
 * publish for `useInView`.
 *
 * **Why the offset comes from `useScrollViewOffset` and not from an
 * `onScroll` handler.** `onScroll` is a single prop holding one opaque
 * Reanimated worklet bag. There is no supported way to run two of them, so a
 * container that took `onScroll` for itself would silently drop the handler a
 * consumer passed from `useScroll()` — or be dropped by it. Reading the offset
 * off the animated ref leaves the prop untouched, so `useScroll` and
 * `useInView` work in the same container without either knowing about the
 * other.
 */
export function useScrollSource(
  horizontal: boolean,
  userRef: Ref<unknown> | undefined,
  userOnLayout: ((event: LayoutChangeEvent) => void) | undefined,
): ScrollSource {
  const animatedRef = useAnimatedRef()
  const offset = useScrollViewOffset(animatedRef)
  const length = useSharedValue(0)
  const nodeRef = useRef<unknown>(null)

  const setRef = useCallback(
    (node: unknown) => {
      nodeRef.current = node
      // The animated ref is itself a ref callback; calling it is what
      // `ref={animatedRef}` would do, and it is what registers the view tag
      // that `useScrollViewOffset` reads.
      animatedRef(node as never)
      if (typeof userRef === 'function') userRef(node)
      else if (userRef) (userRef as MutableRefObject<unknown>).current = node
    },
    // `animatedRef` is identity-stable per hook instance (Reanimated
    // guarantee), the same way a `useRef` result is.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [userRef],
  )

  const onLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const { width, height } = event.nativeEvent.layout
      length.value = horizontal ? width : height
      userOnLayout?.(event)
    },
    // `length` is identity-stable per hook instance.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [horizontal, userOnLayout],
  )

  const getNode = useCallback(() => nodeRef.current, [])

  const value = useMemo(
    () => ({ offset, length, horizontal, getNode }),
    [offset, length, horizontal, getNode],
  )

  return { value, setRef, onLayout }
}
