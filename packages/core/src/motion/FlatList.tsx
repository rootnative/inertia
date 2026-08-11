import type { FlatList as RNFlatList, FlatListProps } from 'react-native'
import Animated from 'react-native-reanimated'
import type { MotionProps, VariantsMap } from '../types'
import { createMotionComponent } from './createMotionComponent'

/**
 * Animatable, virtualized `FlatList`.
 *
 * Built on Reanimated's `Animated.FlatList` rather than RN's `FlatList`. That
 * wrapper supplies two things this primitive would otherwise have to
 * re-implement: the `CellRendererComponent` injection that powers per-row
 * `itemLayoutAnimation`, and a `scrollEventThrottle` default of 1.
 *
 * A note on that throttle default, because the reasoning is easy to get wrong
 * from Reanimated's own source comment: it says RN defaults FlatList's
 * `scrollEventThrottle` to 50, which **is stale**. On RN 0.81
 * (`@react-native/virtualized-lists`, `VirtualizedList.js`) the default is
 * `props.scrollEventThrottle ?? 0.0001` — effectively every frame. So the
 * patch is belt-and-braces on current RN rather than the load-bearing reason
 * to use the wrapper. It is still worth inheriting: it costs nothing, and it
 * pins the behaviour if RN's default changes again. **Do not restate the "50"
 * figure as fact** — verify against the installed RN before relying on it.
 *
 * This is the primitive that lets one list both virtualize and animate. The
 * `useScroll()` handler works because `Motion.*` components are Reanimated
 * animated components — the same mechanism `Motion.ScrollView` relies on, and
 * nothing about it was ever specific to `ScrollView`:
 *
 * ```tsx
 * const { scrollY, onScroll } = useScroll()
 *
 * <Motion.FlatList
 *   data={items}
 *   renderItem={renderItem}
 *   onScroll={onScroll}
 *   initial={{ opacity: 0 }}
 *   animate={{ opacity: 1 }}
 * />
 * ```
 *
 * Two scoping notes:
 *
 * - `animate` / `initial` / `gesture` apply to the **scroll container**, not to
 *   rows. Animate rows by using a `Motion.*` primitive inside `renderItem`.
 * - The `layout` prop animates the list frame. Per-row layout animation is
 *   Reanimated's `itemLayoutAnimation`, which is forwarded through untouched.
 *   Note that row-level layout animation can fight the list's own measurement
 *   passes — measure before adopting it.
 */
export const MotionFlatList = createMotionComponent(
  Animated.FlatList as never,
  // `createMotionComponent<C>` returns a non-generic `MotionComponent<C>`, so
  // `data` / `renderItem` would collapse to `any` and lose `ItemT` inference.
  // Restore it with the same call-signature cast Reanimated itself uses for
  // this exact problem (see its `ReanimatedFlatList` export, and the
  // `@ts-expect-error` above `AnimatedFlatList` explaining that
  // `createAnimatedComponent` cannot create generic components).
  //
  // **Both** generics live on the one call signature, and that is deliberate:
  // `ItemT` infers from `data` while `V` infers from `variants`, independently.
  // Declaring only `ItemT` (the obvious first cut) silently drops the
  // variant-key narrowing that `MotionComponent` provides on every other
  // primitive — `animate="typo"` would stop being a compile error here and
  // nowhere else. Both directions are pinned in
  // `__type-tests__/flat-list.test-d.tsx`.
) as unknown as <
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ItemT = any,
  V extends VariantsMap<FlatListProps<ItemT>> = VariantsMap<
    FlatListProps<ItemT>
  >,
>(
  props: FlatListProps<ItemT> &
    MotionProps<FlatListProps<ItemT>, V> & {
      ref?: React.Ref<RNFlatList<ItemT>>
    },
) => React.ReactElement
