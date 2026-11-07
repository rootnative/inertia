<!-- Absolute URL: npm does not resolve repository-relative image paths. -->
<img src="https://raw.githubusercontent.com/rootnative/inertia/main/assets/brand/inertia-mark.png" alt="" width="88" height="88" />

# @rootnative/inertia-svg

[![npm](https://img.shields.io/npm/v/@rootnative/inertia-svg.svg)](https://www.npmjs.com/package/@rootnative/inertia-svg)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)

Animatable SVG primitives for [`@rootnative/inertia`](../core), built on [`react-native-svg`](https://github.com/software-mansion/react-native-svg).

`MotionPath` accepts the same `initial`, `animate`, and `transition` shape as the core `Motion.*` primitives. Its animatable keys are the path data (`d`), the color paint (`fill`, `stroke`), and the numeric paint (`strokeWidth`, opacities, `strokeDashoffset`). The prebuilt `MotionCircle`, `MotionRect`, and `MotionLine` cover the other common shapes. The `createMotionSvgComponent` factory behind them wraps any `react-native-svg` element. The `MotionSvg` namespace also exposes everything (`MotionSvg.Path`, `.Circle`, `.Rect`, `.Line`).

## Install

```sh
pnpm add @rootnative/inertia-svg react-native-svg
```

`react-native-svg` works in a bare React Native project and in Expo.

**Peer dependencies:** `@rootnative/inertia` (workspace or installed), `react >=19.3.0`, `react-native >=0.88.0 <0.89.0`, `react-native-reanimated >=4.7.0 <4.8.0`, `react-native-svg >=15.16.0 <16.0.0`.

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

The static `d` prop sets the visual on the first render and **locks the command sequence** for the lifetime of the component. Every target `d` (in `initial` or `animate`) must give the same command letters in the same order after implicit-repeat expansion. To switch between shapes with a different structure, remount with a new `key`.

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

Per-property transitions work. Pass a `{ [key]: TransitionConfig }` shape to `transition` instead of one config, for example:

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

In dev, the component throws on a template mismatch at mount, when `animate.d` changes its shape, or when the static `d` prop itself changes its shape between renders. In production, those errors become a snap with no animation, so one bad target doesn't crash the screen.

Path resampling between shapes with a different structure (in the style of flubber) is out of scope by design. For an arbitrary shape swap, remount with `key={...}`.

## Shapes — MotionCircle, MotionRect, MotionLine

Prebuilt geometry primitives with the same `initial`, `animate`, and `transition` surface. Each one animates its numeric geometry props (`cx`, `cy`, `r`; `x`, `y`, `width`, `height`, `rx`, `ry`; `x1`, `y1`, `x2`, `y2`), the `fill` and `stroke` paints (`stroke` only for `MotionLine`), opacities, and `strokeDashoffset`. It also animates `strokeDasharray` element-wise, with the array length locked at mount, the same rule that `MotionPath` applies to path commands. The canonical use is a circular progress ring:

```tsx
import Svg from 'react-native-svg'
import { MotionCircle } from '@rootnative/inertia-svg'

const CIRCUMFERENCE = 2 * Math.PI * 40

<Svg viewBox="0 0 100 100" width={96} height={96}>
  <MotionCircle
    cx={50}
    cy={50}
    r={40}
    fill="none"
    stroke="#4f46e5"
    strokeWidth={8}
    strokeDasharray={[CIRCUMFERENCE]}
    animate={{ strokeDashoffset: CIRCUMFERENCE * (1 - progress) }}
    transition={{ type: 'timing', duration: 250 }}
  />
</Svg>
```

## createMotionSvgComponent

The factory behind the prebuilt shapes. It wraps any other `react-native-svg` element:

```tsx
import { Ellipse } from 'react-native-svg'
import { createMotionSvgComponent } from '@rootnative/inertia-svg'

const MotionEllipse = createMotionSvgComponent(Ellipse, {
  animatableProps: ['cx', 'cy', 'rx', 'ry', 'strokeWidth', 'opacity'],
  colorProps: ['fill', 'stroke'],
  arrayProps: ['strokeDasharray'],
})
```

`animatableProps` are numbers, `colorProps` are color strings, and `arrayProps` are numeric arrays (element-wise, with the length locked at mount). `transition` accepts a named transition from the nearest `<MotionConfig transitions>`, top-level and per property.

## Reduced motion

All primitives follow `<MotionConfig reducedMotion>` the same as the core primitives. When the reduce-motion setting of the OS is on, or you pass `reducedMotion="always"`, every animated property snaps directly to its target.

## What this package doesn't do

- Path resampling between arbitrary shapes.
- A morph from an `L` to a `C`, or any other interpolation across commands. Element-wise scalar interpolation is intentional.

## Documentation

- Full docs: [https://rootnative.github.io/inertia/docs/svg](https://rootnative.github.io/inertia/docs/svg)
- Core library: [`@rootnative/inertia`](../core)

AI agents: this package ships its own copy of the reference. Read `node_modules/@rootnative/inertia-svg/llms.txt` for the full API. You need no network.

## License

MIT
