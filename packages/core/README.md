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
- **Gestures** — single `gesture` prop on every primitive: `gesture={{ pressed, focused, focusVisible, hovered }}`. Sub-states layer **additively** in priority order (`hovered → focused → focusVisible → pressed`); each layer fades in/out on its own progress so MD3 release-while-hovered cross-fades correctly. Per-layer transitions via `transition.<stateName>`. `focusVisible` engages only on keyboard focus (W3C `:focus-visible`) so click-focus on web doesn't flash a ring; on native it tracks `focused`. Zero overhead when omitted.
- **`<Presence>`** — mount/unmount transitions; exiting children automatically receive `pointerEvents: 'none'`.
- **`<MotionConfig reducedMotion>`** — OS reduce-motion honored end-to-end (`'user' | 'never' | 'always'`).
- **`layout` prop** — auto-layout transitions on every primitive, bridging Reanimated's `LinearTransition` via the same react-spring vocab (`tension`/`friction`/`mass`). Accepts `boolean | TransitionConfig`.
- **Value-layer hooks** — `useMotionValue`, `useSpring`, `useAnimation`, `useTransform`, `useScroll`, `useVariants`, `useGesture`. The escape hatch for animations the prop surface can't express — sibling overlays driven by a parent gesture, indeterminate loops on standalone shared values, gesture-smoothed inputs, etc.
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

Or the barrel — same primitives, named imports tree-shake cleanly because the package is `sideEffects: false`:

```ts
import { MotionView } from '@onlynative/inertia'
```

Both forms land at ~4.1–4.2 kB brotlied for a single primitive (peers excluded). The full namespace (`import { Motion } from '@onlynative/inertia'`, then `Motion.View`) cannot tree-shake — accessing one property of a literal object holds the whole object live — and lands at ~4.8 kB. CI checks all three forms via `size-limit` so the gap doesn't drift.

## Transitions

| `type`               | Public config keys                                                                           | Maps to                             |
| -------------------- | -------------------------------------------------------------------------------------------- | ----------------------------------- |
| `'spring'` (default) | `tension`, `friction`, `mass`, `velocity`, `restSpeedThreshold`, `restDisplacementThreshold` | `withSpring`                        |
| `'timing'`           | `duration`, `easing`, `delay`                                                                | `withTiming`                        |
| `'decay'`            | `velocity`, `deceleration`, `clamp`                                                          | `withDecay`                         |
| `'no-animation'`     | —                                                                                            | direct assignment, no interpolation |

Plus, on any transition: `delay`, `repeat`. Per-property transitions take precedence over the top-level transition. Spring config uses **react-spring vocabulary** (`tension`/`friction`); Reanimated's raw `stiffness`/`damping` is never on the public surface.

## Caveats

- **`Motion.Pressable` does not support function-form `style`.** RN's `Pressable` accepts `style={({ pressed }) => ...}` and re-runs it per state change; Inertia inherits Reanimated's `createAnimatedComponent` wrapper, which silently drops that form (no error, no warning). Drive press/focus/hover styling through `gesture` instead, or compute conditional styles once in render. See [primitives/pressable](https://onlynative.github.io/inertia/docs/primitives/pressable#style-must-be-a-value-not-a-function).
- **`initial` is read once on mount.** Mutating `initial` after first render does nothing — change the component `key`, remount via `<Presence>`, or drive the value through a controller. Pass `initial={false}` to skip the initial-mount animation entirely.

## Animatable properties

Numeric: `opacity`, `translateX`, `translateY`, `scale`, `scaleX`, `scaleY`, `rotate`, `rotateX`, `rotateY`, `width`, `height`, `borderRadius`. Color: `backgroundColor`, `borderColor`, `color`, `tintColor` (Image only — `Motion.View` rejects it at compile time). Layout transforms via `transform: [...]`. Color targets are forwarded straight through `withSpring` / `withTiming`; Reanimated's value setter packs the string to RGBA and interpolates on the UI thread.

SVG path morphing ships in the [`@onlynative/inertia-svg`](../svg) adapter (`MotionPath`). Out of scope for `0.x`: shared-element transitions across screens (Reanimated 4 dropped `sharedTransitionTag`; a measure-based replacement is in design).

## When not to use the core package alone

Three sibling packages extend Inertia for capabilities that need extra peer dependencies. The core stays minimal so apps that don't need these don't pay for them.

**Continuous gestures** — the `gesture` prop in `@onlynative/inertia` covers `pressed` / `focused` / `focusVisible` / `hovered` (the Pressable-shaped sub-states). For drag, pan, or swipe, use [`@onlynative/inertia-gestures`](../gestures):

- `useDrag` — one- or two-axis drag with optional constraints and rubber-band elasticity
- `usePan` — camera-style pan with momentum on release
- `useSwipe` — directional commit-or-snap-back (distance + velocity thresholds)

```sh
pnpm add @onlynative/inertia-gestures react-native-gesture-handler
```

**Animated gradients** — colors / start / end / locations interpolation on a linear gradient lives in [`@onlynative/inertia-gradients`](../gradients), wrapping `expo-linear-gradient`:

```sh
pnpm add @onlynative/inertia-gradients expo-linear-gradient
```

**SVG path morphing** — `MotionPath` lives in [`@onlynative/inertia-svg`](../svg), wrapping `react-native-svg`. Animates path data (`d`) on structurally-compatible paths via element-wise scalar interpolation, plus `fill` / `stroke` / `strokeWidth` / opacities / `strokeDashoffset`:

```sh
pnpm add @onlynative/inertia-svg react-native-svg
```

Keeping `react-native-gesture-handler`, `expo-linear-gradient`, and `react-native-svg` out of the core peer set means apps that animate buttons, sheets, and basic styles don't pay for capabilities they never invoke.

## Documentation

Full docs, every primitive's example screen, and an `llms-full.txt` reference live at:

- [https://onlynative.github.io/inertia/](https://onlynative.github.io/inertia/)
- [llms.txt](https://onlynative.github.io/inertia/llms.txt) — concise overview
- [llms-full.txt](https://onlynative.github.io/inertia/llms-full.txt) — full API reference

## License

[MIT](./LICENSE) © OnlyNative
