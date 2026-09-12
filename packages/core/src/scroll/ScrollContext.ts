import { createContext, useContext } from 'react'
import { type SharedValue } from 'react-native-reanimated'

/**
 * What a scroll container publishes so a descendant can tell whether it is on
 * screen.
 *
 * Both members are shared values because the consumer — `useInView` — does its
 * arithmetic in a worklet. A scroll position that arrived as React state would
 * cost a render per frame and land a frame late.
 */
export interface ScrollContextValue {
  /**
   * Scroll offset along the container's own axis, in points, on the UI
   * thread. One scalar, not a pair: a container scrolls in one direction, and
   * `horizontal` says which.
   */
  offset: SharedValue<number>
  /**
   * Length of the visible container along the same axis, in points. `0` until
   * the container's first layout pass.
   */
  length: SharedValue<number>
  /** `true` when the container scrolls horizontally. */
  horizontal: boolean
  /**
   * The container's host node, for a measurement relative to it. Read through
   * a function rather than held as a value because the node arrives after the
   * context value is built, and a ref swap must not re-render every
   * descendant.
   */
  getNode: () => unknown
}

/**
 * Published by `Motion.ScrollView` and `Motion.FlatList`; read by `useInView`.
 *
 * `null` means no Inertia scroll container is above this element. That is a
 * legitimate state — an element on a fixed screen is simply always visible —
 * so the consumer treats it as a fallback, not an error.
 */
export const ScrollContext = createContext<ScrollContextValue | null>(null)

/** Read the nearest scroll container, or `null` when there is none. */
export function useScrollContext(): ScrollContextValue | null {
  return useContext(ScrollContext)
}
