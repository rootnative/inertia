---
sidebar_position: 4
---

# Motion.Image

Animatable `Image`. `animate` / `initial` / `exit` / `gesture` are typed against `ImageStyle`, so `tintColor` autocompletes here (and is rejected on other primitives).

```tsx
import { Motion } from '@rootnative/inertia'

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
import { MotionImage } from '@rootnative/inertia/image'
```

## Animatable keys (alpha)

`opacity`, `translateX`, `translateY`, `scale`, `scaleX`, `scaleY`, `rotate`, `rotateX`, `rotateY`, `tintColor`.

```tsx
<Motion.Image
  source={icon}
  initial={{ tintColor: '#9ca3af' }}
  animate={{ tintColor: active ? '#0a84ff' : '#9ca3af' }}
  transition={{ type: 'timing', duration: 180 }}
/>
```
