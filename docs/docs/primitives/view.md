---
sidebar_position: 2
---

# Motion.View

Animatable `View`. The default primitive — use it for boxes, surfaces, and anything that doesn't need to be `Text` / `Image` / scrolling / pressable.

```tsx
import { Motion } from '@onlynative/inertia'

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
import { MotionView } from '@onlynative/inertia/view'
```

## Animatable keys

`opacity`, `translateX`, `translateY`, `scale`, `scaleX`, `scaleY`, `rotate`, `width`, `height`, `borderRadius`.

## Notes

- `transform` is composed automatically. Mixing transform keys (e.g. `translateX` + `scale`) into one `animate` object emits a single `transform` array — you don't write `transform: [...]` yourself.
- `rotate` is a number, in degrees. The factory wraps it as `{ rotate: '${value}deg' }` for Reanimated.
- `width` / `height` interpolation can jitter on Fabric for non-`flex: 1` containers. Prefer `scaleX` / `scaleY` for resize animations where layout impact is acceptable.
