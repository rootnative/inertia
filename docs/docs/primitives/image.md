---
sidebar_position: 4
---

# Motion.Image

Animatable `Image`. `animate` / `initial` / `exit` / `gesture` are typed against `ImageStyle`, so `tintColor` autocompletes here (and is rejected on other primitives).

```tsx
import { Motion } from '@onlynative/inertia'

export function Avatar({ source }: { source: { uri: string } }) {
  return (
    <Motion.Image
      source={source}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{
        opacity: { type: 'timing', duration: 200 },
        scale: { type: 'spring', tension: 220, friction: 18 },
      }}
      style={avatarStyles.image}
    />
  )
}
```

## Tree-shaken import

```ts
import { MotionImage } from '@onlynative/inertia/image'
```

## Animatable keys (alpha)

`opacity`, `translateX`, `translateY`, `scale`, `scaleX`, `scaleY`, `rotate`. `tintColor` is in the typed surface for forward-compatibility but interpolation lands with the color phase of v0.1.
