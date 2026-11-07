---
sidebar_position: 2
description: Wrap any component with the Motion prop surface — its style prop type is inferred and flows through to animate, initial, exit, and gesture.
---

# createMotionComponent

Wrap any React component with the same Motion prop surface. TypeScript infers the type of the `style` prop of the component and uses it for `animate`, `initial`, `exit`, and `gesture`. There is no shared union fallback, and you don't write the style type by hand.

## Signature

```ts
function createMotionComponent<C extends ComponentType<any>>(
  Component: C,
): MotionComponent<C>
```

## Wrapping a third-party component

You can animate most third-party React Native primitives, as long as they forward `style` to a host node. For example, wrap `expo-image`:

```tsx
import { Image } from 'expo-image'
import { createMotionComponent } from '@rootnative/inertia'

export const MotionExpoImage = createMotionComponent(Image)

// `animate` is inferred from expo-image's `style` prop
<MotionExpoImage
  source={source}
  initial={{ opacity: 0, scale: 0.95 }}
  animate={{ opacity: 1, scale: 1 }}
  transition={{ type: 'spring' }}
/>
```

## Wrapping a styled component

The same applies to your own wrapper component that exposes `style`:

```tsx
import { createMotionComponent } from '@rootnative/inertia'
import { Card } from './Card'

export const MotionCard = createMotionComponent(Card)
```

Inertia uses the `createAnimatedComponent` of Reanimated internally, so the wrapped component must accept a `style` prop that reaches a host element. A component that wraps its style several layers deep without forwarding can fail to animate, because Reanimated needs a path to the host node.

## What you get

- All the standard Motion props: `animate`, `initial`, `exit`, `transition`, `variants`, `controller`, `gesture`, and `onAnimationEnd`.
- `style` inference per component: `tintColor` autocompletes on a wrapped image, and a wrapped view rejects it.
- The same memoization, sequence, and reduced-motion behavior as every built-in `Motion.*` primitive.

## Caveats

- The factory doesn't support the function form `style={(state) => ...}` of Pressable. Drive the press-state style through `gesture.pressed` instead.
- A component that changes the shape of `style` before it forwards it (for example, from a string to a stylesheet ref) can animate incorrectly. Test it with one transform or opacity before you use it in production.
