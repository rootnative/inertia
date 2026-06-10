---
sidebar_position: 3
---

# Motion.Text

Animatable `Text`. `animate` / `initial` / `exit` / `gesture` are typed against `TextStyle`.

```tsx
import { Motion } from '@rootnative/inertia'

export function Heading({ visible }: { visible: boolean }) {
  return (
    <Motion.Text
      initial={{ opacity: 0, translateY: 8 }}
      animate={{ opacity: visible ? 1 : 0, translateY: visible ? 0 : 8 }}
      transition={{ type: 'spring' }}
      style={headingStyles.title}
    >
      Hello
    </Motion.Text>
  )
}
```

## Tree-shaken import

```ts
import { MotionText } from '@rootnative/inertia/text'
```

## Animatable keys (alpha)

`opacity`, `translateX`, `translateY`, `scale`, `scaleX`, `scaleY`, `rotate`, `rotateX`, `rotateY`, `color`. `fontSize` interpolation is deferred — drop to a `useSharedValue` + `useAnimatedStyle` workflow if you need it today.

```tsx
<Motion.Text
  initial={{ color: '#6b7280' }}
  animate={{ color: pressed ? '#4f46e5' : '#6b7280' }}
  transition={{ type: 'timing', duration: 150 }}
>
  Tap me
</Motion.Text>
```
