---
slug: /
sidebar_position: 1
---

# Inertia

Declarative animation primitives for React Native, built on `react-native-reanimated`. Inspired by Framer Motion (web) and react-spring (cross-platform).

> **Status:** `0.0.1-alpha`. The Phase-1 foundation is in place — `Motion.View` / `Motion.Text` / `Motion.Image` with `initial` + `animate` + per-property `transition`. Sequences, variants, gestures, `<Presence>`, decay, and `<MotionConfig>` are landing toward v0.1. See the repo's `CLAUDE.md` for the roadmap.

## Why Inertia

- **DX-first.** Animations are props on a component, not imperative shared values, worklets, and `useAnimatedStyle` boilerplate.
- **Per-primitive style inference.** `Motion.View` accepts `ViewStyle` keys, `Motion.Text` accepts `TextStyle`, `Motion.Image` accepts `ImageStyle`. No shared union fallback that lets wrong props slip through.
- **react-spring vocabulary.** Spring config uses `tension`, `friction`, `mass`, `velocity`. Reanimated's raw `stiffness` / `damping` never appear in the public surface.
- **One `gesture` prop on every primitive.** `pressed`, `focused`, `hovered` (web) sub-states; no `whileTap` / `whilePress` soup, no separate "pressable" variant.
- **Per-primitive tree-shaking.** Subpath imports (`@onlynative/inertia/view`, `/text`, `/image`, `/pressable`, `/scroll-view`) so apps that animate one element don't ship the whole library.
- **Stable worklets.** The factory hashes resolved animate / transition objects and memoizes the generated worklet + `useAnimatedStyle` — re-renders with unchanged values produce zero new UI-thread closures.

## Install

```bash
pnpm add @onlynative/inertia react-native-reanimated
```

Then enable the Reanimated Babel plugin per its [install guide](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/installation).

## A first animation

```tsx
import { Motion } from '@onlynative/inertia'

export function FadeIn() {
  return (
    <Motion.View
      initial={{ opacity: 0, translateY: 20 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{
        opacity: { type: 'timing', duration: 200 },
        translateY: { type: 'spring', tension: 180, friction: 12 },
      }}
    />
  )
}
```

For tree-shaking when only one primitive is used:

```ts
import { MotionView } from '@onlynative/inertia/view'
```

## Where to next

- [Installation](./installation) — install + Reanimated Babel plugin.
- [Primitives](./primitives/index.md) — `Motion.View` / `Text` / `Image` / `Pressable` / `ScrollView`.
- [Transitions](./transitions) — `spring` (default) / `timing` / `decay` / `no-animation`.
- [Sequences & repeat](./sequences) — keyframe arrays and the unified `repeat` shape.
- [Variants](./variants) — named animation states + `useVariants` controller.
- [Gestures](./gestures) — `pressed` / `focused` / `hovered` sub-states.
- [Presence](./presence) — mount / unmount transitions.
- [MotionConfig](./motion-config) — reduce-motion gate.
- [Hooks](./api/hooks) and [createMotionComponent](./api/create-motion-component) — escape hatches.
