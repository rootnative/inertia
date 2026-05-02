# @onlynative/inertia

Declarative animation primitives for React Native, built on `react-native-reanimated`.

> **Status:** `0.0.1-alpha` — Phase-1 foundation only. `Motion.View` / `Motion.Text` / `Motion.Image` with `initial` + `animate` + per-property `transition` (spring, timing). Sequences, variants, gestures, `<Presence>`, and `decay` are tracked toward v0.1 — see the repo's `CLAUDE.md` for the roadmap.

## Install

```sh
pnpm add @onlynative/inertia react-native-reanimated
```

Then follow the [Reanimated install guide](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/installation) to enable its Babel plugin.

## Usage

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

## Animatable properties (alpha)

`opacity`, `translateX`, `translateY`, `scale`, `scaleX`, `scaleY`, `rotate`, `width`, `height`, `borderRadius`. Color, layout, and SVG path morphing are not in alpha.
