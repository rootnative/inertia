---
sidebar_position: 2
---

# createMotionComponent

Wrap any React component with the same Motion prop surface. The component's `style` prop type is inferred and flows through to `animate` / `initial` / `exit` / `gesture` — no shared union fallback, no need to specify the style type by hand.

## Signature

```ts
function createMotionComponent<C extends ComponentType<any>>(
  Component: C,
): MotionComponent<C>
```

## Wrapping a third-party component

Most third-party RN primitives can be animated as long as they forward `style` to a host node. For example, wrapping `expo-image`:

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

If you have a wrapper component that exposes `style`, the same applies:

```tsx
import { createMotionComponent } from '@rootnative/inertia'
import { Card } from './Card'

export const MotionCard = createMotionComponent(Card)
```

Inertia uses Reanimated's `createAnimatedComponent` internally, so the wrapped component must accept a `style` prop that ends up on a host element. Components that wrap their style multiple layers deep without forwarding may fail to animate — Reanimated needs a path to the host node.

## What you get

- `animate`, `initial`, `exit`, `transition`, `variants`, `controller`, `gesture`, `onAnimationEnd` — all the standard Motion props.
- Per-component `style` inference: `tintColor` will autocomplete on a wrapped image but be rejected on a wrapped view.
- The same memoization, sequence, and reduced-motion behavior every built-in `Motion.*` primitive enjoys.

## Caveats

- The function-style `style={(state) => ...}` Pressable form is not supported by the factory. Drive press-state styling through `gesture.pressed` instead.
- Components that re-shape `style` before forwarding (e.g. transforming a string into a stylesheet ref) may not animate cleanly. Test with a single transform or opacity before relying on it for production.
