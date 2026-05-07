# Inertia

[![Node >=20](https://img.shields.io/badge/node-%3E%3D20-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![pnpm 10](https://img.shields.io/badge/pnpm-10.x-F69220?logo=pnpm&logoColor=white)](https://pnpm.io/)
[![Expo SDK 54](https://img.shields.io/badge/expo-54-000020?logo=expo&logoColor=white)](https://expo.dev/)
[![Reanimated 4](https://img.shields.io/badge/reanimated-4.x-B57EDC)](https://docs.swmansion.com/react-native-reanimated/)
[![Turborepo](https://img.shields.io/badge/monorepo-turbo-EF4444)](https://turbo.build/)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](#license)

**Declarative animation primitives for React Native**, built as a thin, ergonomic wrapper around [`react-native-reanimated`](https://docs.swmansion.com/react-native-reanimated/). Inertia takes design cues from Framer Motion (web) and React Spring (cross-platform) and ships the props-driven surface — `<Motion.View animate={{ ... }} transition={{ ... }} />` — without making you hand-roll worklets, shared values, or `useAnimatedStyle`.

> [Documentation](https://onlynative.github.io/inertia/) &nbsp;|&nbsp; [GitHub](https://github.com/onlynative/inertia)

> **Status:** `0.0.1-alpha`. The published surface is intentionally small while the `v0.1` acceptance criteria lock in. Pre-1.0 minor versions may break — see [Versioning](#versioning--release).

## Features

- **Props over hooks** — `initial`, `animate`, `exit`, `transition`, `variants`, `gesture`, `controller`, `onAnimationEnd` all expressed declaratively. Hooks exist as an escape hatch, not the primary API.
- **Per-primitive style inference** — `Motion.View` accepts `ViewStyle`, `Motion.Text` accepts `TextStyle`, `Motion.Image` accepts `ImageStyle`. No shared union fallback, no `Record<string, any>`.
- **React-spring vocabulary** — public springs use `tension`, `friction`, `mass`, `velocity`. Reanimated's raw `stiffness`/`damping` never appear on the public types.
- **First-class sequences and keyframes** — `animate={{ x: [0, 100, 0] }}` and per-step transitions `[{ to: 100, type: 'spring' }]`. Unified `repeat` config (`number | 'infinite' | { count, alternate }`).
- **State-machine animations** — `variants={{ open: {...}, closed: {...} }}` with `animate="open"`. Variant keys autocomplete. `useVariants` returns a `{ current, transitionTo }` controller for programmatic flows.
- **One `gesture` prop on every primitive** — `gesture={{ pressed: {...}, focused: {...}, focusVisible: {...}, hovered: {...} }}` works on `Motion.View`, `Motion.Pressable`, etc. `focusVisible` engages only on keyboard focus (W3C `:focus-visible`) so rings don't flash on click-focus on web. Zero overhead when omitted; no separate "pressable" variant.
- **`<Presence>` for mount/unmount** — half the noise of `<AnimatePresence>`, and exiting children automatically receive `pointerEvents: 'none'` so the next tap reaches what's underneath.
- **`<MotionConfig reducedMotion="user">`** — respects OS reduce-motion settings end-to-end. Per-component overrides via `reducedMotion` prop.
- **JS-thread resolver, memoized worklets** — animate/transition objects compile to baked `withSpring` / `withTiming` / `withDecay` calls on the JS thread. The worklet body only consumes them, and re-renders with unchanged values produce zero new UI-thread closures.
- **Per-primitive subpath imports** — `@onlynative/inertia/view`, `/text`, `/image`, `/pressable`, `/scroll-view`. Tree-shaking is verified in CI.
- **TypeScript-first** — strict mode, end-to-end inference, no escape-hatch `any` in the public surface.

## Install

```bash
pnpm add @onlynative/inertia react-native-reanimated
```

Then follow the [Reanimated install guide](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/installation) to enable its Babel plugin.

**Peer dependencies:**

```bash
npx expo install react react-native react-native-reanimated
```

## Quick Start

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

Tree-shaking when only one primitive is used:

```ts
import { MotionView } from '@onlynative/inertia/view'
```

### Sequences and keyframes

```tsx
<Motion.View
  animate={{
    translateX: [0, 100, 0],
    opacity: [
      0,
      { to: 1, type: 'spring', tension: 200 },
      { to: 0, delay: 500 },
    ],
  }}
  transition={{ repeat: 'infinite' }}
/>
```

### Variants

```tsx
const variants = {
  closed: { translateY: 100, opacity: 0 },
  open: { translateY: 0, opacity: 1 },
} as const

<Motion.View variants={variants} animate={isOpen ? 'open' : 'closed'} />
```

For programmatic chaining, `useVariants(variants)` returns a `{ current, transitionTo }` controller, plugged in via `controller={...}`.

### Gestures

```tsx
<Motion.Pressable
  gesture={{
    pressed: { scale: 0.96 },
    hovered: { opacity: 0.9 },
    focused: { opacity: 0.85 },
    focusVisible: { borderColor: '#4f46e5' },
  }}
  transition={{ type: 'spring' }}
/>
```

`focused` engages on every focus; `focusVisible` engages only when focus arrived from the keyboard. Use `focused` for state-layer fills, `focusVisible` for rings. On native the two move together. Priority on overlap: `pressed > focusVisible > focused > hovered`.

### Presence (mount/unmount)

```tsx
<Presence>
  {visible ? (
    <Motion.View
      key="card"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    />
  ) : null}
</Presence>
```

### Reduce-motion

```tsx
import { MotionConfig } from '@onlynative/inertia'
;<MotionConfig reducedMotion="user">
  <App />
</MotionConfig>
```

`'user'` defers to the OS accessibility setting, `'always'` forces motion off, `'never'` forces it on.

## Transition shapes

| `type`               | Public config keys                                                                           | Maps to                                      |
| -------------------- | -------------------------------------------------------------------------------------------- | -------------------------------------------- |
| `'spring'` (default) | `tension`, `friction`, `mass`, `velocity`, `restSpeedThreshold`, `restDisplacementThreshold` | `withSpring` (converted from spring physics) |
| `'timing'`           | `duration`, `easing`, `delay`                                                                | `withTiming`                                 |
| `'decay'`            | `velocity`, `deceleration`, `clamp`                                                          | `withDecay`                                  |
| `'no-animation'`     | —                                                                                            | direct assignment, no interpolation          |

Plus, on any transition: `delay`, `repeat`. Per-property transitions take precedence over the top-level transition. User-supplied `easing` functions are auto-wrapped as worklets at JS time, so plain JS easing functions don't crash inside variants.

### Repeat config

| Form                           | Meaning                                       |
| ------------------------------ | --------------------------------------------- |
| `repeat: 3`                    | Run 3 times total, alternating direction.     |
| `repeat: 'infinite'`           | Loop forever, alternating direction.          |
| `repeat: { count, alternate }` | Full control. `alternate` defaults to `true`. |

### Animatable properties

`opacity`, `translateX`, `translateY`, `scale`, `scaleX`, `scaleY`, `rotate`, `rotateX`, `rotateY`, `backgroundColor`, `borderRadius`, `width`, `height`. Layout transforms via `transform: [...]`. Color interpolation uses Reanimated's color utilities.

Out of scope for `v0.1`: SVG path morphing, gradient interpolation, shared-element transitions across screens (those land in `v0.2`+).

## Packages

| Package                                    | Description                                                                                                        |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------ |
| [`@onlynative/inertia`](packages/core)     | Animation primitives (`Motion.*`), transition resolvers, `<Presence>`, `<MotionConfig>`, `useVariants`.            |
| _`@onlynative/inertia-gestures`_ (planned) | Optional adapter that swaps the Pressable-based gesture layer for `react-native-gesture-handler`. Lands in `v0.2`. |
| [`example`](example)                       | Expo Router app with one screen per primitive — manual validation harness.                                         |
| [`docs`](docs)                             | Docusaurus documentation site. Hosts `/llms.txt` and `/llms-full.txt`.                                             |

## Repository Layout

```text
.
├── docs/                  # Docusaurus documentation site
├── example/               # Expo Router validation app (one screen per primitive)
│   └── screens/           # ViewScreen, TextScreen, ImageScreen, PressableScreen,
│                          # ScrollViewScreen, SequenceScreen, VariantsScreen,
│                          # PresenceScreen, GestureScreen, DecayScreen,
│                          # MotionConfigScreen, PerfBenchScreen
├── packages/
│   └── core/              # @onlynative/inertia
│       └── src/
│           ├── motion/    # Motion.View / Text / Image / Pressable / ScrollView + factory
│           ├── transitions/  # spring / timing / decay / no-animation resolvers
│           ├── values/    # useVariants (escape-hatch hooks layer)
│           ├── presence/  # <Presence>
│           ├── config/    # <MotionConfig>, reduce-motion gating
│           └── types.ts   # Public type surface
├── scripts/               # build-llms.mjs (per-package + aggregated llms docs)
├── turbo.json
└── pnpm-workspace.yaml
```

## Development

### Requirements

- Node.js `>=20`
- pnpm `10.x`
- React `19.1+`, React Native `0.81+`, Expo SDK `54+`
- `react-native-reanimated >=4.0.0` (peer)

### Setup

```bash
pnpm install
```

### Commands

| Command                    | Description                                                          |
| -------------------------- | -------------------------------------------------------------------- |
| `pnpm run build`           | Build all packages with Turborepo                                    |
| `pnpm run dev`             | Watch mode for all packages                                          |
| `pnpm run typecheck`       | Type-check (`tsc --noEmit`) across packages                          |
| `pnpm run test`            | Jest across packages                                                 |
| `pnpm run lint`            | ESLint                                                               |
| `pnpm run format`          | Prettier (whole repo — prefer formatting only the files you touched) |
| `pnpm run example`         | Start the Expo example app                                           |
| `pnpm run example:ios`     | Expo on iOS                                                          |
| `pnpm run example:android` | Expo on Android                                                      |
| `pnpm run docs:dev`        | Docusaurus dev server                                                |
| `pnpm run docs:build`      | Build the docs site                                                  |
| `pnpm run build:llms`      | Regenerate `llms.txt` / `llms-full.txt`                              |
| `pnpm run clean`           | Clean build outputs and `node_modules`                               |

After editing source, run Prettier on just the files you changed: `npx prettier --write path/to/file.ts`.

### Running the Example App

```bash
pnpm run example            # Start Expo dev server

# Or target a specific platform
pnpm --filter @onlynative/inertia-example ios
pnpm --filter @onlynative/inertia-example android
```

Each `Motion.*` primitive, sequence behaviour, variant flow, gesture sub-state, presence transition, and the decay + reduce-motion paths have a dedicated screen under [example/screens/](example/screens/). Frame-level animation correctness is validated here — Jest with the Reanimated mock can only assert final state.

### Testing

- Tests live in `src/__tests__/` per package.
- `@testing-library/react-native` plus the standard `react-native-reanimated/mock` (wired in [jest.setup.js](jest.setup.js)).
- The mock resolves animations synchronously — assert **final** state, not intermediate frames.
- Pure functions (variant resolution, transition compilation) get plain unit tests with no rendering.

## Tech Stack

| Layer           | Technology                                              |
| --------------- | ------------------------------------------------------- |
| Runtime         | React 19.1, React Native 0.81+, Expo SDK 54+            |
| Animation       | `react-native-reanimated` `>=4.0.0` (peer)              |
| Language        | TypeScript 5 (strict mode)                              |
| Build           | tsup (package bundling), Turborepo (task orchestration) |
| Package Manager | pnpm 10 (workspace protocol)                            |
| Testing         | Jest 29, @testing-library/react-native                  |
| Documentation   | Docusaurus 3                                            |

## Design Principles

1. **Props over hooks** — declarative is the default surface; hooks are the escape hatch.
2. **Reanimated under the hood, hidden by default** — worklets, shared values, and `useAnimatedStyle` are implementation details consumers should not have to touch for the common case.
3. **Inspired by prior art, not bound to it** — clearer names win over familiar ones; one name per concept, no dual aliases.
4. **Spring-first transitions, designer vocabulary** — `tension`/`friction`/`mass` are the public surface; raw Reanimated names never appear on it.
5. **Strong TypeScript inference end-to-end** — `animate`, `initial`, `exit`, and `gesture` sub-states all infer from the underlying component's style props.
6. **Per-primitive tree-shaking** — every `Motion.*` is reachable via a subpath import.
7. **First-class sequences and keyframes from `v0.1`** — not bolted on later.
8. **Stable worklets across renders, JS-thread resolution** — animate/transition objects compile on the JS thread; the worklet body never iterates `Object.keys(...)` at frame time.
9. **No new runtime dependencies beyond Reanimated** — gesture-handler is opt-in via a separate package.
10. **Zero-config interop with `@onlynative/ui`** — primitives compose cleanly with components that already animate state layers via Reanimated.

## Versioning & Release

- Pre-1.0 (`0.x`) until the public API has been validated against `@onlynative/ui` and at least one external app. Breaking changes are allowed in minor versions during 0.x and documented in `CHANGELOG.md`.
- Changesets handle release notes once published.
- The `transition` config vocabulary (`tension`/`friction`) and the `variants` shape are the highest-churn-risk areas — they get locked at 1.0.

## Contributing

Conventions inherited from [`@onlynative/ui`](https://github.com/onlynative/ui): no semicolons, single quotes, trailing commas; ESLint flat config; no inline `style={{ ... }}` objects in JSX (extract to a `const` / `useMemo` / `StyleSheet.create`); strict TypeScript everywhere.

When working on the UI-thread code, three rules catch the silent breakages:

1. Every callback that runs on the UI thread must be a worklet (`'worklet'` directive, or a Reanimated hook that already establishes a worklet context).
2. Don't close over JS-thread state inside a worklet — go through a shared value or a `runOnJS` boundary.
3. `useAnimatedStyle` must be deterministic — same inputs, same output. Read shared values, don't mutate them.

After editing source, run Prettier on just the files you changed (`npx prettier --write path/to/file.ts`) — don't run `pnpm run format` on the whole repo.

## License

This project is licensed under the [MIT License](LICENSE).
