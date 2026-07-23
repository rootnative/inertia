---
sidebar_position: 4
---

# Reanimated interop

`@rootnative/inertia/reanimated` re-exports the Reanimated **render-layer** primitives, so a component built on Inertia's value layer can keep `@rootnative/inertia` as its only animation import.

Inertia's contract is that consumers shouldn't need to import from `react-native-reanimated` to get 90% of use cases done. The `Motion.*` primitives cover the declarative side; the value-layer hooks (`useGesture`, `useAnimation`, `useScroll`, …) cover custom state. What's left is the component that owns its **own** `useAnimatedStyle` worklet over Inertia-driven shared values — a component library styling a `Pressable` from `useGesture` progress values, for example. This subpath serves exactly that case.

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

`SharedValue` is also exported from the root entry (`import type { SharedValue } from '@rootnative/inertia'`) — every value-layer hook returns one, so the type is part of Inertia's own surface. Reach for the root export when you only need the type; this subpath when you need the runtime primitives too.

:::note You rarely need `Animated.View` as a host
`Animated` is here for `createAnimatedComponent` on a **third-party** component and for the occasional bespoke need. You do **not** need `Animated.View` (or `Animated.Text`, …) just to render an animated-style fragment from `useColorTransition` / `useShadow` / `useInterpolatedStyle` / `useColorCascade` — a prop-less `Motion.View` is already a [zero-cost plain host](../primitives#plain-host-zero-cost-pass-through) for exactly that, with no extra Reanimated import. Reach for `Animated.*` only when you own a hand-rolled `useAnimatedStyle` / `useAnimatedProps` worklet (the case at the top of this page).
:::

## Why the names don't change

Re-exporting under the original names is a hard constraint, not a style choice. The Reanimated Babel plugin auto-workletizes the callback you pass to `useAnimatedStyle` / `useAnimatedProps` / `useDerivedValue` by **callee name** — it doesn't care which module the name was imported from, but a renamed wrapper (`useStyle`, say) would silently stop workletizing your callback and break on native. The re-exports keep both the name and the original function reference, so worklet behavior is identical from either import path. (A test pins every export to reference-identity with the Reanimated original.)

For the same reason, your project still needs `react-native-reanimated` installed and its Babel plugin configured — this subpath changes where your imports point, not what runs underneath.

## What's deliberately _not_ here

The animation factories (`withTiming`, `withSpring`, `withDecay`, `withSequence`) are not re-exported. Starting animations is Inertia's own vocabulary:

- declaratively — the `animate` prop, [`useAnimation` / `useSpring` / `useBooleanSpring`](./hooks.md);
- imperatively from the JS thread — [`resolveTransition`](./transition-utilities.md#resolvetransitionconfig-tovalue-callback);
- from inside a gesture worklet — [`buildReleaseAnimation`](./hooks.md#buildreleaseanimationtransition-tovalue).

All of those accept the standard `TransitionConfig` shape (named transitions included), which is the point: if this subpath re-exported `withTiming`, custom components would grow ad-hoc `{ duration, easing }` configs that bypass reduced-motion gating and the named-transition registry. If you find yourself wanting a `with*` factory, reach for the resolver that matches your thread instead.
