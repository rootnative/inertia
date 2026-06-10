# @rootnative/inertia-gradients

[![npm](https://img.shields.io/npm/v/@rootnative/inertia-gradients.svg)](https://www.npmjs.com/package/@rootnative/inertia-gradients)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)

Animatable linear gradient primitive for [`@rootnative/inertia`](../core), built on [`expo-linear-gradient`](https://docs.expo.dev/versions/latest/sdk/linear-gradient/).

`MotionLinearGradient` accepts the same `initial` / `animate` / `transition` shape as the core `Motion.*` primitives, with animatable keys for `colors`, `start`, `end`, and `locations`.

## Install

```sh
pnpm add @rootnative/inertia-gradients expo-linear-gradient
```

`expo-linear-gradient` works in bare React Native projects as well as Expo — no `expo-modules-core` runtime is required.

**Peer dependencies:** `@rootnative/inertia` (workspace or installed), `react >=19.0.0`, `react-native >=0.81.0`, `react-native-reanimated >=4.0.0`, `expo-linear-gradient >=14.0.0`.

## Usage

```tsx
import { StyleSheet } from 'react-native'
import { MotionLinearGradient } from '@rootnative/inertia-gradients'

export function Hero() {
  return (
    <MotionLinearGradient
      colors={['#0f172a', '#1e293b']}
      animate={{ colors: ['#7c3aed', '#0ea5e9'] }}
      transition={{ type: 'timing', duration: 600 }}
      style={StyleSheet.absoluteFill}
    />
  )
}
```

The static `colors` prop sets the visual on first render and **locks the slot count** for the component's lifetime. To resize the gradient (e.g. swap a 2-stop for a 3-stop), remount via `key={...}`. The component throws in dev if `colors.length` changes between renders.

## Animatable props

| Key         | Shape                      | Notes                                                                                                                         |
| ----------- | -------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `colors`    | `readonly string[]`        | Element-wise color interpolation via Reanimated's color setter. Length must match the static `colors` prop.                   |
| `start`     | `{ x: number, y: number }` | Normalized `[0, 1]` coordinates. `x` and `y` animate independently.                                                           |
| `end`       | `{ x: number, y: number }` | Same shape as `start`.                                                                                                        |
| `locations` | `readonly number[]`        | Optional stop positions. If supplied at mount, must remain supplied and same-length as `colors` for the component's lifetime. |

Per-property transitions work just like the core primitives:

```tsx
<MotionLinearGradient
  colors={['#000', '#000']}
  animate={{
    colors: ['#7c3aed', '#0ea5e9'],
    start: { x: 0, y: 0 },
    end: { x: 1, y: 1 },
  }}
  transition={{
    colors: { type: 'timing', duration: 600 },
    start: { type: 'spring', tension: 80, friction: 14 },
    end: { type: 'spring', tension: 80, friction: 14 },
  }}
/>
```

## `initial`

Pass `initial` to override the mount-frame values (so the component starts somewhere other than the static props), or `initial={false}` to start at the `animate` target with no mount animation.

```tsx
<MotionLinearGradient
  colors={['#111', '#222']}
  initial={{ colors: ['#000', '#000'] }} // fade up from black
  animate={{ colors: ['#7c3aed', '#0ea5e9'] }}
/>
```

## Reduced motion

`MotionLinearGradient` participates in `<MotionConfig reducedMotion>` the same way the core primitives do — when the OS reduce-motion setting is on, transitions resolve as direct assignment instead of `withSpring` / `withTiming`.

## What this primitive doesn't do (v0.2)

- **Radial / conic gradients** — linear-only for v0.2.
- **Slot-count resize** — the colors array length is locked at mount.
- **Per-stop sequence keyframes** — `animate.colors` accepts a single target array, not nested arrays. For chained gradient transitions, drive the target through state.

## Documentation

- Full docs: [https://rootnative.github.io/inertia/docs/gradients](https://rootnative.github.io/inertia/docs/gradients)
- Core library: [`@rootnative/inertia`](../core)

## License

[MIT](./LICENSE) © RootNative
