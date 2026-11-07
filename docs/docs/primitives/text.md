---
sidebar_position: 3
description: Animatable Text, with animate, initial, exit, and gesture typed against TextStyle.
---

# Motion.Text

Animatable `Text`. `animate`, `initial`, `exit`, and `gesture` take the `TextStyle` type.

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

**Text metrics.** `fontSize`, `letterSpacing`, and `lineHeight` animate since `0.0.5`. Before that, they passed the type check but did nothing, and the docs recommended a hand-written `useAnimatedStyle`. You don't need that workaround anymore. They exist on `TextStyle` only, so `Motion.View` and `Motion.Image` reject them at compile time.

```tsx
<Motion.Text
  initial={{ fontSize: 14, letterSpacing: 0 }}
  animate={{ fontSize: 20, letterSpacing: 1.5 }}
  transition={{ type: 'spring', tension: 200, friction: 18 }}
>
  Scaling headline
</Motion.Text>
```

Each of these keys measures the text again on every frame, which costs more than the transform path. When the text only has to _look_ bigger, and you don't want a reflow, animate `scale` instead. It composites with no new measurement. Use `fontSize` when the content around the text must reflow around the new size.

```tsx
<Motion.Text
  initial={{ color: '#6b7280' }}
  animate={{ color: pressed ? '#4f46e5' : '#6b7280' }}
  transition={{ type: 'timing', duration: 150 }}
>
  Tap me
</Motion.Text>
```
