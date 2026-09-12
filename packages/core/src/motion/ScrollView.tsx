import { forwardRef } from 'react'
import { ScrollView, type ScrollViewProps } from 'react-native'
import { ScrollContext, useScrollSource } from '../scroll'
import type { MotionComponent, MotionComponentProps } from '../types'
import { createMotionComponent } from './createMotionComponent'

const BaseMotionScrollView = createMotionComponent(ScrollView)

/**
 * Animatable `ScrollView`. Animations apply to the scroll container itself —
 * useful for entrance transforms or fades on the whole list. Scroll-position
 * driven animation (`useScroll`) lands in the values layer.
 *
 * It also publishes its scroll offset and its visible length to its
 * descendants, which is what lets `useInView` work on native with no wiring at
 * the call site:
 *
 * ```tsx
 * <Motion.ScrollView>
 *   <Card />        // a `useInView(ref)` inside Card needs nothing else
 * </Motion.ScrollView>
 * ```
 *
 * The offset is read off the container's animated ref, so the `onScroll` prop
 * stays free for `useScroll()`. Both hooks can drive the same container.
 */
export const MotionScrollView = forwardRef<
  unknown,
  MotionComponentProps<typeof ScrollView>
>(function MotionScrollView(props, ref) {
  const { horizontal, onLayout, children, ...rest } = props as ScrollViewProps &
    MotionComponentProps<typeof ScrollView>
  const scroll = useScrollSource(horizontal === true, ref, onLayout)

  return (
    <ScrollContext.Provider value={scroll.value}>
      <BaseMotionScrollView
        {...(rest as MotionComponentProps<typeof ScrollView>)}
        horizontal={horizontal}
        ref={scroll.setRef}
        onLayout={scroll.onLayout}
      >
        {children}
      </BaseMotionScrollView>
    </ScrollContext.Provider>
  )
  // The wrapper is a plain `forwardRef`, so it has no generic call signature.
  // Restore the one `createMotionComponent` produces — it is what narrows
  // `animate`'s string form to the keys of the `variants` prop at each call
  // site. Without the cast every `Motion.ScrollView` use would lose variant
  // narrowing, and nowhere else would.
}) as unknown as MotionComponent<typeof ScrollView>
