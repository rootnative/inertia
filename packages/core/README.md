# @onlynative/inertia

[![npm](https://img.shields.io/npm/v/@onlynative/inertia.svg)](https://www.npmjs.com/package/@onlynative/inertia)
[![Reanimated 4](https://img.shields.io/badge/reanimated-4.x-B57EDC)](https://docs.swmansion.com/react-native-reanimated/)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)

Declarative animation primitives for React Native, built as a thin wrapper around [`react-native-reanimated`](https://docs.swmansion.com/react-native-reanimated/). Inspired by Framer Motion (web) and react-spring (cross-platform).

> **Status:** `0.0.1-alpha`. Pre-1.0 minor versions may break — see the root [README](https://github.com/onlynative/inertia#versioning--release).

## Install

```sh
pnpm add @onlynative/inertia react-native-reanimated
```

Then enable the [Reanimated Babel plugin](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/installation).

**Peer dependencies:** `react >=19.0.0`, `react-native >=0.81.0`, `react-native-reanimated >=4.0.0`.

## Quick start

```tsx
import { Motion, Presence } from '@onlynative/inertia'

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

## What ships

- **Primitives** — `Motion.View`, `Motion.Text`, `Motion.Image`, `Motion.Pressable`, `Motion.ScrollView`. Per-primitive style inference (no shared `ViewStyle & TextStyle & ImageStyle` fallback).
- **Sequences and keyframes** — `animate={{ x: [0, 100, 0] }}` with per-step transitions; unified `repeat: number | 'infinite' | { count, alternate }`.
- **Variants** — `variants={{ open, closed }}` with `animate="open"`. Programmatic control via `useVariants` + `controller={...}`.
- **Gestures** — single `gesture` prop on every primitive: `gesture={{ pressed, focused, focusVisible, hovered }}`. `focusVisible` engages only on keyboard focus (W3C `:focus-visible`) so click-focus on web doesn't flash a ring; on native it tracks `focused`. Zero overhead when omitted.
- **`<Presence>`** — mount/unmount transitions; exiting children automatically receive `pointerEvents: 'none'`.
- **`<MotionConfig reducedMotion>`** — OS reduce-motion honored end-to-end (`'user' | 'never' | 'always'`).
- **Per-primitive subpath imports** — `@onlynative/inertia/view`, `/text`, `/image`, `/pressable`, `/scroll-view`.
- **JS-thread resolver, memoized worklets** — animate/transition objects compile to baked `withSpring` / `withTiming` / `withDecay` calls on the JS thread; the worklet body never iterates `Object.keys(...)` at frame time.

## Subpath imports

```ts
import { MotionView } from '@onlynative/inertia/view'
import { MotionText } from '@onlynative/inertia/text'
import { MotionImage } from '@onlynative/inertia/image'
import { MotionPressable } from '@onlynative/inertia/pressable'
import { MotionScrollView } from '@onlynative/inertia/scroll-view'
```

A `Motion.View`-only import currently bundles to ~3.2 kB brotlied (excluding peers).

## Transitions

| `type`               | Public config keys                                                                           | Maps to                             |
| -------------------- | -------------------------------------------------------------------------------------------- | ----------------------------------- |
| `'spring'` (default) | `tension`, `friction`, `mass`, `velocity`, `restSpeedThreshold`, `restDisplacementThreshold` | `withSpring`                        |
| `'timing'`           | `duration`, `easing`, `delay`                                                                | `withTiming`                        |
| `'decay'`            | `velocity`, `deceleration`, `clamp`                                                          | `withDecay`                         |
| `'no-animation'`     | —                                                                                            | direct assignment, no interpolation |

Plus, on any transition: `delay`, `repeat`. Per-property transitions take precedence over the top-level transition. Spring config uses **react-spring vocabulary** (`tension`/`friction`); Reanimated's raw `stiffness`/`damping` is never on the public surface.

## Animatable properties

`opacity`, `translateX`, `translateY`, `scale`, `scaleX`, `scaleY`, `rotate`, `rotateX`, `rotateY`, `backgroundColor`, `borderRadius`, `width`, `height`. Layout transforms via `transform: [...]`. Color interpolation uses Reanimated's color utilities.

Out of scope for `0.x`: SVG path morphing, gradient interpolation, shared-element transitions across screens.

## Documentation

Full docs, every primitive's example screen, and an `llms-full.txt` reference live at:

- [https://onlynative.github.io/inertia/](https://onlynative.github.io/inertia/)
- [llms.txt](https://onlynative.github.io/inertia/llms.txt) — concise overview
- [llms-full.txt](https://onlynative.github.io/inertia/llms-full.txt) — full API reference

## License

[MIT](./LICENSE) © OnlyNative
