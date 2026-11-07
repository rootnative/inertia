---
sidebar_position: 7
description: Animatable, virtualized FlatList — the primitive that lets one list both virtualize and animate.
---

# Motion.FlatList

Animatable, **virtualized** `FlatList`. This primitive lets one list both virtualize and animate. The `onScroll` handler of `useScroll` needs a scrollable that Reanimated animates. Before this primitive, the only animated scroller was [`Motion.ScrollView`](./scroll-view), which mounts every row. A long list had to pick one.

Like `Motion.ScrollView`, the animations apply to the scroll **container**: the list frame, not the rows. A row animates through a `Motion.*` primitive inside `renderItem`. That is what makes a scroll-driven row effect work:

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

`data` and `renderItem` keep their inference. The item type flows from `data` into `renderItem`. Independently, a `variants` map still narrows the string form of `animate`, so `animate="typo"` is a compile error here, the same as on every other primitive.

## Tree-shaken import

```ts
import { MotionFlatList } from '@rootnative/inertia/flat-list'
```

## Notes

- The primitive is built on the `Animated.FlatList` of Reanimated, not on the `FlatList` of React Native. That wrapper injects the `CellRendererComponent` behind the per-row `itemLayoutAnimation`, and its default `scrollEventThrottle` is 1. So a `useScroll` handler on this primitive reports every frame with no extra prop.
- `animate`, `initial`, and `gesture` animate the scroll container. A per-row entrance animation belongs on a `Motion.*` row inside `renderItem`.
- The [`layout` prop](../layout) animates the list frame. Per-row layout animation is the own `itemLayoutAnimation` of Reanimated, which the primitive forwards unchanged. It can conflict with the measurement passes of the list, so measure the result before you adopt it.
- Use this primitive instead of `Motion.ScrollView` whenever the row count is long or unbounded. `Motion.ScrollView` stays the correct choice for a short, fixed set of children.
- Core doesn't wrap `FlashList`, because that would add a peer dependency. Wrap it yourself with [createMotionComponent](../api/create-motion-component), and set `scrollEventThrottle={1}` explicitly, because that patch belongs to Reanimated and doesn't come with the wrap.
