<!-- Absolute URL: npm does not resolve repository-relative image paths. -->
<img src="https://raw.githubusercontent.com/rootnative/inertia/main/assets/brand/inertia-mark.png" alt="" width="88" height="88" />

# @rootnative/inertia-gradients

[![npm](https://img.shields.io/npm/v/@rootnative/inertia-gradients.svg)](https://www.npmjs.com/package/@rootnative/inertia-gradients)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)

Animatable linear gradient primitive for [`@rootnative/inertia`](../core), built on [`expo-linear-gradient`](https://docs.expo.dev/versions/latest/sdk/linear-gradient/).

`MotionLinearGradient` accepts the same `initial`, `animate`, and `transition` shape as the core `Motion.*` primitives, with the animatable keys `colors`, `start`, `end`, and `locations`.

## Install

```sh
pnpm add @rootnative/inertia-gradients expo-linear-gradient
```

`expo-linear-gradient` works in a bare React Native project and in Expo, but it's an Expo Module. A bare project needs the Expo modules runtime. See [Installing Expo modules](https://docs.expo.dev/bare/installing-expo-modules/).

**Peer dependencies:** `@rootnative/inertia` (workspace or installed), `react >=19.3.0`, `react-native >=0.88.0 <0.89.0`, `react-native-reanimated >=4.7.0 <4.8.0`, `expo >=58.0.0 <59.0.0`, `expo-linear-gradient >=58.0.0 <59.0.0`.

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

The static `colors` prop sets the visual on the first render and **locks the slot count** for the lifetime of the component. To resize the gradient (for example, from 2 stops to 3 stops), remount it with `key={...}`. The component throws in dev if `colors.length` changes between renders.

## Animatable props

| Key         | Shape                      | Notes                                                                                                                         |
| ----------- | -------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `colors`    | `readonly string[]`        | Element-wise color interpolation via Reanimated's color setter. Length must match the static `colors` prop.                   |
| `start`     | `{ x: number, y: number }` | Normalized `[0, 1]` coordinates. `x` and `y` animate independently.                                                           |
| `end`       | `{ x: number, y: number }` | Same shape as `start`.                                                                                                        |
| `locations` | `readonly number[]`        | Optional stop positions. If supplied at mount, must remain supplied and same-length as `colors` for the component's lifetime. |

Per-property transitions work the same as in the core primitives:

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

Pass `initial` to override the values of the mount frame, so the component starts somewhere other than the static props. Pass `initial={false}` to start at the `animate` target with no mount animation.

```tsx
<MotionLinearGradient
  colors={['#111', '#222']}
  initial={{ colors: ['#000', '#000'] }} // fade up from black
  animate={{ colors: ['#7c3aed', '#0ea5e9'] }}
/>
```

## Reduced motion

`MotionLinearGradient` follows `<MotionConfig reducedMotion>` the same as the core primitives. When the reduce-motion setting of the OS is on, a transition resolves as a direct assignment instead of `withSpring` or `withTiming`.

## What this primitive doesn't do

- **Radial or conic gradients.** The primitive is linear only. Radial and conic are in the backlog, not scheduled.
- **A slot-count resize.** The length of the colors array is locked at mount.
- **Sequence keyframes per stop.** `animate.colors` accepts one target array, not nested arrays. For chained gradient transitions, drive the target through state.

## Documentation

- Full docs: [https://rootnative.github.io/inertia/docs/gradients](https://rootnative.github.io/inertia/docs/gradients)
- Core library: [`@rootnative/inertia`](../core)

AI agents: this package ships its own copy of the reference. Read `node_modules/@rootnative/inertia-gradients/llms.txt` for the full API. You need no network.

## License

[MIT](./LICENSE) © Root Native
