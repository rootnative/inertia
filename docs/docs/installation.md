---
sidebar_position: 2
---

# Installation

Inertia is a thin wrapper around `react-native-reanimated`. The Reanimated install must complete first — Inertia is a peer to it, not a replacement.

## Prerequisites

- React Native `>= 0.81` (or Expo SDK `54+`)
- React `>= 19`
- `react-native-reanimated >= 4.0.0`

## Install

```bash
pnpm add @onlynative/inertia react-native-reanimated
```

Then enable the Reanimated Babel plugin per its [install guide](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/installation). The plugin is what transforms `'worklet'`-marked functions into UI-thread code; without it, every animation crashes at runtime.

A typical `babel.config.js` for a managed Expo app:

```js
module.exports = function (api) {
  api.cache(true)
  return {
    presets: ['babel-preset-expo'],
    plugins: ['react-native-reanimated/plugin'],
  }
}
```

The Reanimated plugin must be **last** in the plugins array.

## First animation

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

## Subpath imports

Each primitive is reachable directly so apps that animate one element don't pull in the rest:

```ts
import { MotionView } from '@onlynative/inertia/view'
import { MotionText } from '@onlynative/inertia/text'
import { MotionImage } from '@onlynative/inertia/image'
import { MotionPressable } from '@onlynative/inertia/pressable'
import { MotionScrollView } from '@onlynative/inertia/scroll-view'
```

`@onlynative/inertia` is `sideEffects: false`, so a bundler with tree-shaking enabled (Metro 0.79+, Webpack, Rollup) will drop primitives you don't reference even when importing from the main entry.

## Reduced motion

Inertia respects the OS reduce-motion accessibility setting by default — no extra wiring needed. To override the default for the whole app or a subtree, see [MotionConfig](./motion-config).
