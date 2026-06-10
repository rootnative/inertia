# @rootnative/inertia-svg

[![npm](https://img.shields.io/npm/v/@rootnative/inertia-svg.svg)](https://www.npmjs.com/package/@rootnative/inertia-svg)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)

Animatable SVG primitives for [`@rootnative/inertia`](../core), built on [`react-native-svg`](https://github.com/software-mansion/react-native-svg).

`MotionPath` accepts the same `initial` / `animate` / `transition` shape as the core `Motion.*` primitives, with animatable keys for the path data (`d`), color paint (`fill`, `stroke`), and numeric paint (`strokeWidth`, opacities, `strokeDashoffset`).

## Install

```sh
pnpm add @rootnative/inertia-svg react-native-svg
```

`react-native-svg` works in bare React Native projects as well as Expo.

**Peer dependencies:** `@rootnative/inertia` (workspace or installed), `react >=19.0.0`, `react-native >=0.81.0`, `react-native-reanimated >=4.0.0`, `react-native-svg >=15.0.0`.

## Usage

```tsx
import Svg from 'react-native-svg'
import { MotionPath } from '@rootnative/inertia-svg'

export function Heart({ beating }) {
  return (
    <Svg viewBox="0 0 100 100" width={120} height={120}>
      <MotionPath
        d="M 50 30 L 70 12 L 90 30 L 50 88 L 10 30 L 30 12 Z"
        fill="#ef4444"
        stroke="#991b1b"
        strokeWidth={3}
        animate={{
          d: beating
            ? 'M 50 28 L 71 10 L 92 28 L 50 92 L 8 28 L 29 10 Z'
            : 'M 50 30 L 70 12 L 90 30 L 50 88 L 10 30 L 30 12 Z',
        }}
        transition={{ type: 'spring', tension: 200, friction: 10 }}
      />
    </Svg>
  )
}
```

The static `d` prop sets the visual on first render and **locks the command sequence** for the component's lifetime. Every target `d` (via `initial` or `animate`) must produce the same command letters in the same order after implicit-repeat expansion. To switch between structurally different shapes, remount with a new `key`.

## Animatable props

| Key                | Type     | Notes                                                                                             |
| ------------------ | -------- | ------------------------------------------------------------------------------------------------- |
| `d`                | `string` | Path morph via element-wise scalar interpolation. Source and target must share the same template. |
| `fill`             | `string` | Color, interpolated by Reanimated's color setter.                                                 |
| `stroke`           | `string` | Color.                                                                                            |
| `strokeWidth`      | `number` | Numeric.                                                                                          |
| `strokeOpacity`    | `number` | 0–1.                                                                                              |
| `fillOpacity`      | `number` | 0–1.                                                                                              |
| `opacity`          | `number` | 0–1.                                                                                              |
| `strokeDashoffset` | `number` | Useful for "draw-in" animations on a dashed stroke.                                               |

Per-property transitions are supported — pass a `{ [key]: TransitionConfig }` shape to `transition` instead of a single config, e.g.

```tsx
transition={{
  d: { type: 'spring', tension: 160, friction: 14 },
  fill: { type: 'timing', duration: 300 },
}}
```

## Structural compatibility

```
✅ M 0 0 L 10 10 Z       ↔ M 50 50 L 80 80 Z       same template: M L Z
✅ M 0 0 10 10 20 20     ↔ M 0 0 L 30 30 L 40 40   same after implicit-repeat expansion (M → L)
❌ M 0 0 L 10 10 Z       ↔ M 0 0 L 10 10           segment count differs
❌ M 0 0 L 10 10         ↔ M 0 0 l 10 10           absolute vs relative are distinct templates
❌ M 0 0 L 10 10         ↔ M 0 0 C 1 1 2 2 3 3     command letters differ
```

In dev, the component throws on template mismatches at mount, when `animate.d` changes shape, or when the static `d` prop itself changes shape between renders. In production those errors degrade to a no-op snap so a single bad target doesn't crash the screen.

Path resampling between structurally different shapes (flubber-style) is out of scope for v0.2. For arbitrary shape swaps, remount with `key={...}`.

## Reduced motion

`MotionPath` participates in `<MotionConfig reducedMotion>` just like the core primitives — when the OS reduce-motion setting is on (or you pass `reducedMotion="always"`), every animated property snaps directly to its target.

## What this package doesn't do (v0.2)

- Other SVG shapes (`Circle`, `Rect`, `Line`, `Ellipse`) — land in a follow-up once the `MotionPath` API is validated.
- Path resampling between arbitrary shapes.
- Morphing an `L` into a `C` (or other across-command interpolation). Element-wise scalar interpolation is intentional.

## License

MIT
