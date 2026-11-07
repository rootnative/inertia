---
sidebar_position: 4
description: '@rootnative/inertia/reanimated re-exports the Reanimated render-layer primitives, so Inertia stays your only animation import.'
---

# Reanimated interop

`@rootnative/inertia/reanimated` re-exports the **render-layer** primitives of Reanimated. So a component on the value layer of Inertia can keep `@rootnative/inertia` as its only animation import.

The contract of Inertia is that you don't need to import from `react-native-reanimated` for 90% of the use cases. The `Motion.*` primitives cover the declarative side. The value-layer hooks (`useGesture`, `useAnimation`, `useScroll`, …) cover custom state. What is left is the component that owns its **own** `useAnimatedStyle` worklet over shared values that Inertia drives, for example a component library that styles a `Pressable` from the progress values of `useGesture`. This subpath serves that case.

```tsx
import { useGesture } from '@rootnative/inertia'
import {
  Animated,
  interpolateColor,
  useAnimatedStyle,
} from '@rootnative/inertia/reanimated'
import { Pressable } from 'react-native'

const AnimatedPressable = Animated.createAnimatedComponent(Pressable)

function GlowCard({ children }) {
  const { pressed, handlers } = useGesture()
  const animatedStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      pressed.value,
      [0, 1],
      ['#1c1b1f', '#332f38'],
    ),
  }))
  return (
    <AnimatedPressable style={animatedStyle} {...handlers}>
      {children}
    </AnimatedPressable>
  )
}
```

## Surface

Everything is a **pure re-export** from `react-native-reanimated`, under its original name:

| Export                                                             | Kind                                                                                      |
| ------------------------------------------------------------------ | ----------------------------------------------------------------------------------------- |
| `Animated`                                                         | The animated-component namespace (`Animated.View`, `Animated.createAnimatedComponent`, …) |
| `createAnimatedComponent`                                          | Named form of `Animated.createAnimatedComponent`                                          |
| `useAnimatedStyle` / `useAnimatedProps` / `useDerivedValue`        | The worklet-callback hooks                                                                |
| `interpolate` / `interpolateColor` / `Extrapolation`               | Worklet-safe interpolators                                                                |
| `cancelAnimation`                                                  | Stop a running animation on a shared value                                                |
| `SharedValue` / `DerivedValue` / `AnimatedStyle` / `AnimatedProps` | Types                                                                                     |

The root entry also exports `SharedValue` (`import type { SharedValue } from '@rootnative/inertia'`). Every value-layer hook returns one, so the type is part of the own surface of Inertia. Use the root export when you only need the type. Use this subpath when you also need the runtime primitives.

:::note You rarely need `Animated.View` as a host
`Animated` is here for `createAnimatedComponent` on a **third-party** component, and for a rare custom need. You do **not** need `Animated.View` (or `Animated.Text`, …) to render an animated-style fragment from `useColorTransition`, `useShadow`, `useInterpolatedStyle`, or `useColorCascade`. A `Motion.View` with no props is already a [zero-cost plain host](../primitives#plain-host-zero-cost-pass-through) for that, with no extra Reanimated import. Use `Animated.*` only when you own a hand-written `useAnimatedStyle` or `useAnimatedProps` worklet (the case at the top of this page).
:::

## Why the names don't change

The re-export under the original names is a hard constraint, not a style choice. The Reanimated Babel plugin turns the callback that you pass to `useAnimatedStyle`, `useAnimatedProps`, or `useDerivedValue` into a worklet by **callee name**. The plugin doesn't care which module exports the name. A renamed wrapper (`useStyle`, for example) would stop the workletization of your callback with no warning, and your app would break on native. The re-exports keep both the name and the original function reference, so the worklet behavior is identical from either import path. A test pins every export to reference identity with the Reanimated original.

For the same reason, your project still needs `react-native-reanimated` installed and its Babel plugin configured. This subpath changes where your imports point, not what runs below.

## What is _not_ here, on purpose

The animation factories (`withTiming`, `withSpring`, `withDecay`, `withSequence`) are not re-exported. To start an animation, use the vocabulary of Inertia:

- declaratively: the `animate` prop, or [`useAnimation`, `useSpring`, and `useBooleanSpring`](./hooks.md);
- imperatively from the JS thread: [`resolveTransition`](./transition-utilities.md#resolvetransitionconfig-tovalue-callback);
- from inside a gesture worklet: [`buildReleaseAnimation`](./hooks.md#buildreleaseanimationtransition-tovalue-callback).

All of those accept the standard `TransitionConfig` shape, including named transitions. That is the point. If this subpath re-exported `withTiming`, custom components would grow ad-hoc `{ duration, easing }` configs that skip the reduced-motion gate and the named-transition registry. When you want a `with*` factory, use the resolver that matches your thread instead.
