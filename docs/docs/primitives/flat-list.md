---
sidebar_position: 7
---

# Motion.FlatList

Animatable, **virtualized** `FlatList`. This is the primitive that lets one list both virtualize and animate: `useScroll`'s `onScroll` handler needs a Reanimated-animated scrollable, and before this the only animated scroller was [`Motion.ScrollView`](./scroll-view), which mounts every row. Long lists had to pick one.

Like `Motion.ScrollView`, animations apply to the scroll **container** — the list frame, not the rows. Rows animate by using a `Motion.*` primitive inside `renderItem`, which is what makes scroll-driven row effects work:

```tsx
import { StyleSheet } from 'react-native'
import {
  Motion,
  useScroll,
  useTransform,
  type SharedValue,
} from '@rootnative/inertia'
import { useAnimatedStyle } from 'react-native-reanimated'

const ROW_HEIGHT = 72
const DATA = Array.from({ length: 400 }, (_, i) => ({ id: String(i), i }))

function Row({
  index,
  scrollY,
}: {
  index: number
  scrollY: SharedValue<number>
}) {
  // Fade + lift each row as it approaches the top edge of the viewport.
  const top = index * ROW_HEIGHT
  const opacity = useTransform(scrollY, [top - 220, top - 80], [0.25, 1])
  const shift = useTransform(scrollY, [top - 220, top - 80], [12, 0])
  const rowStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: shift.value }],
  }))

  return <Motion.View style={[styles.row, rowStyle]} />
}

export function Feed() {
  const { scrollY, onScroll } = useScroll()

  return (
    <Motion.FlatList
      data={DATA}
      keyExtractor={(item) => item.id}
      renderItem={({ index }) => <Row index={index} scrollY={scrollY} />}
      onScroll={onScroll}
      initial={{ opacity: 0, translateY: 16 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: 'timing', duration: 240 }}
      style={styles.list}
      contentContainerStyle={styles.content}
    />
  )
}

const styles = StyleSheet.create({
  list: { flex: 1 },
  content: { paddingHorizontal: 20, paddingVertical: 12, gap: 8 },
  row: { height: 64, borderRadius: 10, backgroundColor: '#eef2ff' },
})
```

`data` and `renderItem` keep their inference: the item type flows from `data` into `renderItem`, and — independently — a `variants` map still narrows the string form of `animate`, so `animate="typo"` is a compile error here exactly as on every other primitive.

## Tree-shaken import

```ts
import { MotionFlatList } from '@rootnative/inertia/flat-list'
```

## Notes

- Built on Reanimated's `Animated.FlatList`, not RN's `FlatList`. That wrapper supplies the `CellRendererComponent` injection behind per-row `itemLayoutAnimation`, and it defaults `scrollEventThrottle` to 1 — so a `useScroll` handler attached here reports every frame with no extra prop.
- `animate` / `initial` / `gesture` animate the scroll container. Per-row entrance animations belong on a `Motion.*` row inside `renderItem`.
- The [`layout` prop](../layout) animates the list frame. Per-row layout animation is Reanimated's own `itemLayoutAnimation`, which is forwarded through untouched — note it can fight the list's measurement passes, so measure before adopting it.
- Reach for this over `Motion.ScrollView` whenever the row count is long or unbounded. `Motion.ScrollView` stays the right choice for a short, fixed set of children.
- `FlashList` is not wrapped in core — it would add a peer dependency. Wrap it yourself with [createMotionComponent](../api/create-motion-component), and set `scrollEventThrottle={1}` explicitly, since that patch is Reanimated's and doesn't come along.
