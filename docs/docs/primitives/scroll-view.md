---
sidebar_position: 6
description: Animatable ScrollView, where animations apply to the scroll container itself.
---

# Motion.ScrollView

Animatable `ScrollView`. The animations apply to the scroll **container** itself. Use it for an entrance transform, an exit fade, or a scale of the whole scrollable region.

```tsx
import { Motion } from '@rootnative/inertia'

export function AnimatedFeed() {
  return (
    <Motion.ScrollView
      initial={{ opacity: 0, translateY: 16 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: 'timing', duration: 240 }}
      contentContainerStyle={feedStyles.content}
    >
      {/* rows */}
    </Motion.ScrollView>
  )
}
```

## Tree-shaken import

```ts
import { MotionScrollView } from '@rootnative/inertia/scroll-view'
```

## Notes

- This primitive animates the outer container. To drive an animation from the scroll position itself (parallax, a sticky header), pair it with [`useScroll`](../api/hooks#usescroll). That hook returns the `scrollX` and `scrollY` shared values, plus an `onScroll` handler that you put on this primitive.
- A per-row entrance animation belongs on a `Motion.View` row inside the scroll view, not on the scroll view itself.
- This primitive mounts every child. [`Motion.FlatList`](./flat-list) is the virtualized counterpart, and it takes the same `useScroll` handler. Prefer it for a long or unbounded list. Keep this primitive for a short, fixed set of children.
