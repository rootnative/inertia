---
sidebar_position: 3
description: Animatable Text, with animate, initial, exit, and gesture typed against TextStyle.
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

## Animatable keys

`opacity`, `translateX`, `translateY`, `scale`, `scaleX`, `scaleY`, `rotate`, `rotateX`, `rotateY`, `width`, `height`, `borderRadius`, `color`, `backgroundColor`, plus the layout numerics listed in [Animatable properties](.#animatable-properties).

**Text metrics** — `fontSize`, `letterSpacing`, and `lineHeight` animate as of `0.0.5` (before that they typechecked but were silently dropped, and the docs recommended a hand-rolled `useAnimatedStyle`; that workaround is no longer needed). They're `TextStyle`-only, so they're rejected at compile time on `Motion.View` and `Motion.Image`.

```tsx
<Motion.Text
  initial={{ fontSize: 14, letterSpacing: 0 }}
  animate={{ fontSize: 20, letterSpacing: 1.5 }}
  transition={{ type: 'spring', tension: 200, friction: 18 }}
>
  Scaling headline
</Motion.Text>
```

Each of these re-measures the text every frame, which is heavier than the transform path. When you only need the text to _look_ bigger and reflow isn't wanted, animate `scale` instead — it composites without re-measuring. Use `fontSize` when surrounding content genuinely must reflow around the new size.

```tsx
<Motion.Text
  initial={{ color: '#6b7280' }}
  animate={{ color: pressed ? '#4f46e5' : '#6b7280' }}
  transition={{ type: 'timing', duration: 150 }}
>
  Tap me
</Motion.Text>
```
