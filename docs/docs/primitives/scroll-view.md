---
sidebar_position: 6
---

# Motion.ScrollView

Animatable `ScrollView`. Animations apply to the scroll **container** itself — useful for entrance transforms, exit fades, or scaling the entire scrollable region.

```tsx
import { Motion } from '@onlynative/inertia'

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
import { MotionScrollView } from '@onlynative/inertia/scroll-view'
```

## Notes

- This animates the outer container. To drive animations from scroll position itself (parallax, sticky headers), the `useScroll` hook lands in the values layer post-alpha.
- Per-row entrance animations belong on a `Motion.View` row inside the scroll view, not on the scroll view itself.
