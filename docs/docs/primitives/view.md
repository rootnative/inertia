---
sidebar_position: 2
---

# Motion.View

Animatable `View`. The default primitive — use it for boxes, surfaces, and anything that doesn't need to be `Text` / `Image` / scrolling / pressable.

```tsx
import { Motion } from '@rootnative/inertia'

export function Card() {
  return (
    <Motion.View
      initial={{ opacity: 0, translateY: 24 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: 'spring', tension: 200, friction: 18 }}
      style={cardStyles.card}
    />
  )
}
```

## Tree-shaken import

```ts
import { MotionView } from '@rootnative/inertia/view'
```

## Animatable keys

`opacity`, `translateX`, `translateY`, `scale`, `scaleX`, `scaleY`, `rotate`, `rotateX`, `rotateY`, `width`, `height`, `borderRadius`, `shadowOpacity`, `shadowRadius`, `elevation`, `backgroundColor`, `borderColor`, `shadowColor`, `shadowOffset`.

## Shadow animation

Shadow keys ride the same animatable pipeline as other numeric / color props — `shadowOpacity`, `shadowRadius`, `elevation` are numerics; `shadowColor` is a color. `shadowOffset` is the one nested-object style on the surface; internally the worklet decomposes it into two synthetic axis SVs and recomposes them into a single `{ width, height }` prop each frame.

```tsx
// MD3 elevation cascade — flat numerics + the nested shadowOffset
<Motion.View
  initial={{
    shadowOpacity: 0,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 0 },
    elevation: 0,
  }}
  animate={{
    shadowOpacity: 0.15,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  }}
  gesture={{
    hovered: {
      shadowOpacity: 0.2,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 2 },
      elevation: 2,
    },
  }}
/>
```

`shadowOffset` v0.1 supports the **single-value form only** — `{ width: number, height: number }`. Sequences inside the nested object (`{ width: [0, 100, 0], height: 0 }`) and array keyframes on the whole object are out of scope; drop to the value-layer hooks (`useMotionValue` + `useAnimatedStyle`) when you need them. Per-axis transition splits are also out of scope — the top-level `transition.shadowOffset` applies to both axes.

## Notes

- `transform` is composed automatically. Mixing transform keys (e.g. `translateX` + `scale`) into one `animate` object emits a single `transform` array — you don't write `transform: [...]` yourself.
- `rotate`, `rotateX`, and `rotateY` are numbers, in degrees. The factory wraps each as `{ rotate: '${value}deg' }` (etc.) for Reanimated. Use `rotateX` / `rotateY` together with a `perspective` style entry to get the 3D effect to render.
- `width` / `height` interpolation can jitter on Fabric for non-`flex: 1` containers. Prefer `scaleX` / `scaleY` for resize animations where layout impact is acceptable.
- Shadow rendering is platform-specific: iOS uses `shadowColor` / `shadowOpacity` / `shadowOffset` / `shadowRadius`; Android uses `elevation` (which derives its own shadow). Animate both sets together when you need a cross-platform cascade.
