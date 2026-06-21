# Inertia

[![Node >=20](https://img.shields.io/badge/node-%3E%3D20-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![pnpm 10](https://img.shields.io/badge/pnpm-10.x-F69220?logo=pnpm&logoColor=white)](https://pnpm.io/)
[![Expo SDK 54](https://img.shields.io/badge/expo-54-000020?logo=expo&logoColor=white)](https://expo.dev/)
[![Reanimated 4](https://img.shields.io/badge/reanimated-4.x-B57EDC)](https://docs.swmansion.com/react-native-reanimated/)
[![Turborepo](https://img.shields.io/badge/monorepo-turbo-EF4444)](https://turbo.build/)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

**Declarative animation primitives for React Native**, built as a thin, ergonomic wrapper around [`react-native-reanimated`](https://docs.swmansion.com/react-native-reanimated/). Inertia takes design cues from Framer Motion and React Spring and ships the props-driven surface — `<Motion.View animate={{ ... }} transition={{ ... }} />` — without making you hand-roll worklets, shared values, or `useAnimatedStyle`.

> [Documentation](https://rootnative.github.io/inertia/) &nbsp;|&nbsp; [GitHub](https://github.com/rootnative/inertia)

## Features

- Props-driven API — `initial`, `animate`, `exit`, `transition`, `variants`, `gesture`, `controller`, `onAnimationEnd`
- Per-primitive style inference — `Motion.View` accepts `ViewStyle`, `Motion.Text` accepts `TextStyle`, `Motion.Image` accepts `ImageStyle`
- React-spring vocabulary on the public surface (`tension`, `friction`, `mass`) — Reanimated's raw `stiffness`/`damping` never leak through
- First-class sequences and keyframes with per-step transition overrides
- State-machine animations via `variants` + string `animate="open"` (no hook required for the common case)
- One `gesture` prop on every primitive (`pressed`, `focused`, `focusVisible`, `hovered`) — zero overhead when omitted
- `<Presence>` for mount/unmount with auto `pointerEvents: 'none'` on exiting children
- `<MotionConfig reducedMotion="user">` respects OS reduce-motion settings end-to-end
- JS-thread resolver, memoized worklets — re-renders with unchanged values produce zero new UI-thread closures
- Subpath exports for tree-shaking (`@rootnative/inertia/view`, `/text`, `/image`, `/pressable`, `/scroll-view`)
- TypeScript-first with strict mode and end-to-end inference

## Install

```bash
yarn add @rootnative/inertia react-native-reanimated
```

Then follow the [Reanimated install guide](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/installation) to enable its Babel plugin.

**Peer dependencies** — make sure these are installed in your project:

```bash
npx expo install react react-native react-native-reanimated
```

**Optional** — only needed for drag/swipe/pan gestures:

```bash
yarn add @rootnative/inertia-gestures react-native-gesture-handler
```

**Optional** — animated gradients (`MotionLinearGradient`):

```bash
yarn add @rootnative/inertia-gradients expo-linear-gradient
```

**Optional** — animated SVG path morphing:

```bash
yarn add @rootnative/inertia-svg react-native-svg
```

## Quick Start

```tsx
import { Motion } from '@rootnative/inertia'

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
import { MotionView } from '@rootnative/inertia/view'
```

See the [docs](https://rootnative.github.io/inertia/) for sequences, variants, gestures, `<Presence>`, and reduce-motion examples.

## Transition shapes

| `type`               | Public config keys                                                                           | Maps to                                      |
| -------------------- | -------------------------------------------------------------------------------------------- | -------------------------------------------- |
| `'spring'` (default) | `tension`, `friction`, `mass`, `velocity`, `restSpeedThreshold`, `restDisplacementThreshold` | `withSpring` (converted from spring physics) |
| `'timing'`           | `duration`, `easing`, `delay`                                                                | `withTiming`                                 |
| `'decay'`            | `velocity`, `deceleration`, `clamp`                                                          | `withDecay`                                  |
| `'no-animation'`     | —                                                                                            | direct assignment, no interpolation          |

Plus, on any transition: `delay`, `repeat` (`number | 'infinite' | { count, alternate }`). Per-property transitions take precedence over the top-level transition.

**Animatable properties** — numeric: `opacity`, `translateX`, `translateY`, `scale`, `scaleX`, `scaleY`, `rotate`, `rotateX`, `rotateY`, `width`, `height`, `borderRadius`. Color: `backgroundColor`, `borderColor`, `color`, `tintColor` (Image only). Color targets are forwarded straight through `withSpring` / `withTiming`; Reanimated's value setter handles RGBA interpolation natively. Gradient interpolation lives in [`@rootnative/inertia-gradients`](packages/gradients); SVG path morphing lives in [`@rootnative/inertia-svg`](packages/svg). Shared-element transitions across screens are deferred to `v1.x`.

## When _not_ to use Inertia

Inertia is a declarative wrapper. Some patterns work better one layer down:

- **Continuous gesture-driven UI** (sliders, swipe-to-dismiss, pinch-zoom) — use [`@rootnative/inertia-gestures`](packages/gestures) or drop down to `react-native-gesture-handler` + raw Reanimated.
- **Frame-by-frame data viz** — keep SVG attribute interpolation in raw Reanimated, or use [`@rootnative/inertia-svg`](packages/svg) for declarative path morphing of structurally-compatible paths.
- **Custom physics** — drop down to the `useMotionValue` / `useSpring` / `useTransform` hooks layer.
- **Layout / shared-element transitions** — deferred to `v1.x`; use Reanimated's `Layout` API for now.

The hooks layer mirrors Reanimated's shape, so dropping down doesn't feel like switching tools. See the [migration guide](docs/docs/migrations/from-reanimated.md).

## Packages

| Package                                               | Description                                                                                                                |
| ----------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| [`@rootnative/inertia`](packages/core)                | Animation primitives (`Motion.*`), transition resolvers, `<Presence>`, `<MotionConfig>`, `useVariants`.                    |
| [`@rootnative/inertia-gestures`](packages/gestures)   | Optional `react-native-gesture-handler` adapter — `useDrag`, `useSwipe`, `usePan`.                                         |
| [`@rootnative/inertia-gradients`](packages/gradients) | Optional `expo-linear-gradient` adapter — `MotionLinearGradient` with animatable `colors` / `start` / `end` / `locations`. |
| [`@rootnative/inertia-svg`](packages/svg)             | Optional `react-native-svg` adapter — `MotionPath` with animatable `d` (path morphing), `fill`, `stroke`.                  |
| [`example`](example)                                  | Expo Router app with one screen per primitive — manual validation harness.                                                 |
| [`docs`](docs)                                        | Docusaurus documentation site. Hosts `/llms.txt` and `/llms-full.txt`.                                                     |

## Repository Layout

```text
.
├── docs/                  # Docusaurus documentation site
├── example/               # Expo Router validation app (one screen per primitive)
├── packages/
│   ├── core/              # @rootnative/inertia
│   │   └── src/
│   │       ├── motion/        # Motion.View / Text / Image / Pressable / ScrollView + factory
│   │       ├── transitions/   # spring / timing / decay / no-animation resolvers
│   │       ├── values/        # useVariants (escape-hatch hooks layer)
│   │       ├── presence/      # <Presence>
│   │       ├── config/        # <MotionConfig>, reduce-motion gating
│   │       └── types.ts       # Public type surface
│   ├── gestures/          # @rootnative/inertia-gestures
│   │   └── src/           # useDrag / useSwipe / usePan (gesture-handler adapter)
│   ├── gradients/         # @rootnative/inertia-gradients
│   │   └── src/           # MotionLinearGradient (expo-linear-gradient adapter)
│   └── svg/               # @rootnative/inertia-svg
│       └── src/           # MotionPath + path utils (react-native-svg adapter)
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

| Command               | Description                                 |
| --------------------- | ------------------------------------------- |
| `pnpm run build`      | Build all packages with Turborepo           |
| `pnpm run dev`        | Watch mode for all packages                 |
| `pnpm run typecheck`  | Type-check (`tsc --noEmit`) across packages |
| `pnpm run test`       | Jest across packages                        |
| `pnpm run lint`       | ESLint                                      |
| `pnpm run format`     | Prettier (whole repo)                       |
| `pnpm run example`    | Start the Expo example app                  |
| `pnpm run docs:dev`   | Docusaurus dev server                       |
| `pnpm run docs:build` | Build the docs site                         |
| `pnpm run build:llms` | Regenerate `llms.txt` / `llms-full.txt`     |
| `pnpm run clean`      | Clean build outputs and `node_modules`      |

After editing source, run Prettier on just the files you changed: `npx prettier --write path/to/file.ts`.

### Running the Example App

```bash
pnpm run example            # Start Expo dev server

# Or target a specific platform
pnpm --filter @rootnative/inertia-example ios
pnpm --filter @rootnative/inertia-example android
```

Each `Motion.*` primitive, sequence behaviour, variant flow, gesture sub-state, presence transition, and the decay + reduce-motion paths have a dedicated screen under [example/screens/](example/screens/). Frame-level animation correctness is validated here — Jest with the Reanimated mock can only assert final state.

### Testing

```ts
import { renderWithMotion } from '@rootnative/inertia/testing'

const { getByTestId } = renderWithMotion(
  <Motion.View testID="card" initial={{ opacity: 0 }} animate={{ opacity: 1 }} />,
)
expect(getByTestId('card').props.style).toMatchObject({ opacity: 1 })
```

Tests live in `src/__tests__/` per package. The Reanimated mock resolves animations synchronously — assert **final** state, not intermediate frames. See [Testing](docs/docs/testing.md) for the full contract.

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

## Contributing

Conventions inherited from [`@rootnative/ui`](https://github.com/rootnative/ui): no semicolons, single quotes, trailing commas; ESLint flat config; no inline `style={{ ... }}` objects in JSX (extract to a `const` / `useMemo` / `StyleSheet.create`); strict TypeScript everywhere.

When working on UI-thread code, three rules catch the silent breakages:

1. Every callback that runs on the UI thread must be a worklet.
2. Don't close over JS-thread state inside a worklet — go through a shared value or a `runOnJS` boundary.
3. `useAnimatedStyle` must be deterministic — read shared values, don't mutate them.

After editing source, run Prettier on just the files you changed (`npx prettier --write path/to/file.ts`).

## License

This project is licensed under the [MIT License](LICENSE).
