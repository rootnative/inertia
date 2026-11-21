# Changelog of the alphas

The release notes of the `0.0.0-alpha` versions of the four packages. The CHANGELOG of each package starts at `0.0.1`. This file goes away later.

## `@rootnative/inertia`

### [0.0.0-alpha.5] - 2026-07-21

#### Changed

- **Non-worklet transformers and easings now dev-warn.** `useTransform`'s transformer overload and custom `timing.easing` functions must be worklets (`'worklet'` directive as the first statement). The previous "plain functions are auto-wrapped" promise was unfulfillable: the directive-wrapped fallback closes over the opaque function reference, not the shared values read inside it, so Reanimated cannot extract dependencies (a `useTransform` derived value silently only refreshed on React re-renders — found via a frozen TextField label float in the UI library) and native builds reject the plain function when the closure is serialized to the UI thread. The fallback wrapper remains as a web-only best effort, but both sites now `console.warn` once in dev (suppressed under Jest, where the shared stubs report every function as non-worklet). Docs (`transitions.md`, `layout.md`, `api/hooks.md`) and docstrings corrected to state the real contract.

### [0.0.0-alpha.4] - 2026-07-21

#### Fixed

- **First mouse click after page load no longer draws a focus ring** (web). The `focusVisibility` input-modality listeners attached lazily on the first `isFocusVisible()` call — which happens _during_ the focus dispatch of that first click, after its `mousedown` had already passed unobserved — leaving the default `'keyboard'` modality and misclassifying the pointer interaction as keyboard focus. The listeners now install eagerly at module import (the lazy path remains as a safety net for environments where `document` appears after import).

### [0.0.0-alpha.3] - 2026-07-21

#### Fixed

- **Named transitions resolve correctly across subpath entries.** `splitting: false` in the tsup config made every dist entry inline its own copy of `MotionConfigContext`, so the provider (root entry) and consumers (e.g. the `/gesture-layer` subpath) held different React contexts and every registered name silently fell back to the default spring. Dist now builds with code splitting so the context module is shared.

### [0.0.0-alpha.2] - 2026-07-20

#### Added

- **`useGestureLayer` returns per-state progress** — the result now carries `states: GestureLayerProgress`, the five 0↔1 progress shared values behind the composed style (`hovered` / `focused` / `focusVisible` / `pressed` from the underlying `useGesture`, plus the hook-owned `disabled` progress). Lets styles derived from the same gesture wiring — an elevation crossfade via `useShadow({ from, to, progress: states.hovered })`, an icon tint — reuse the hook's progress values instead of duplicating the cascade through a parallel `useGesture` call. Purely additive; the exposed shared values are identity-stable across renders and are the same objects the worklet reads (treat as read-only — the handlers own the writes). The `GestureLayerProgress` type is exported from the `/gesture-layer` subpath.

#### Changed

- Published bundles no longer include sourcemaps, and the `__type-tests__` directories are excluded from the npm package (packaging-only; no runtime change).

### [0.0.0-alpha.1] - 2026-07-19

#### Added

- **Named transition registry** — `<MotionConfig transitions={{ name: TransitionConfig }}>` registers named transitions for the subtree; the name is accepted everywhere a `TransitionConfig` is: the `transition` prop (top-level, per-property, per gesture layer), the `layout` prop, and `useAnimation` / `useSpring` / `useBooleanSpring` / `useGesture` / `useGestureLayer`. Names resolve at the nearest provider; nested providers merge with child-overrides-per-name; unknown names warn in dev and fall back to the default spring. No presets ship — names are consumer vocabulary. New exports: `useNamedTransitions()`, `resolveNamedTransition()`, and the `TransitionName` / `TransitionInput` / `NamedTransitions` / `RegisteredTransitions` types (`RegisteredTransitions` is the augmentation point for compile-time-typed names).

- **`cubicBezier()` easing helper** — builds a `timing.easing` value from cubic-bezier control points as four numbers, as a W3C CSS `cubic-bezier(x1, y1, x2, y2)` string, or as a CSS keyword (`'linear'` / `'ease'` / `'ease-in'` / `'ease-out'` / `'ease-in-out'`). Makes CSS-format design-token easings directly consumable (pair with the named-transition registry). Invalid input throws: `x1` / `x2` must be finite and within `[0, 1]`; `step-*` keywords and the CSS `linear(...)` function are unsupported. The `EasingFunction` / `EasingFunctionFactory` / `EasingInput` types are now exported from the root barrel.

#### Changed

- **Nested `<MotionConfig>` now inherits `reducedMotion`** from its ancestor when the prop is omitted (previously an inner provider silently reset the subtree to the `'user'` default). A transitions-only inner provider no longer clobbers an outer `reducedMotion="never"` / `"always"`.

### 0.0.0-alpha.0

_No git tag was cut for this release; the published artifact is on npm as [`@rootnative/inertia@0.0.0-alpha.0`](https://www.npmjs.com/package/@rootnative/inertia/v/0.0.0-alpha.0). Unlinked here for that reason — every other heading resolves to a real tag._

Initial alpha publish. The full initial surface is in place; APIs are still subject to change before the stability lock at `1.0.0`.

#### Added

- **Primitives** — `Motion.View`, `Motion.Text`, `Motion.Image`, `Motion.Pressable`, `Motion.ScrollView` with per-primitive style inference (no shared `ViewStyle & TextStyle & ImageStyle` fallback).
- **Subpath imports** — `@rootnative/inertia/view`, `/text`, `/image`, `/pressable`, `/scroll-view` for per-primitive tree-shaking. Bundle-size baselines recorded via `size-limit`.
- **Transitions** — `spring` (default, react-spring vocabulary `tension`/`friction`/`mass`/`velocity`), `timing` (with auto-worklet-wrapped easing functions), `decay`, `no-animation`. Per-property `transition` shape takes precedence over top-level.
- **Sequences and keyframes** — `animate={{ x: [0, 100, 0] }}` and `[{ to, ...override }]` step shape with per-step transition overrides.
- **Repeat config** — unified `repeat: number | 'infinite' | { count, alternate }` shape; `alternate` defaults to `true`.
- **Variants** — `variants={{ open, closed }}` + `animate="open"` props; `useVariants` hook returning `{ current, transitionTo, subscribe }` for programmatic flows; `controller` prop wires the hook back to the component.
- **Gestures** — single `gesture` prop on every primitive: `pressed`, `focused`, `hovered` (web) sub-states. Pressable-based, zero overhead when omitted.
- **`<Presence>`** — mount/unmount transitions on top of Reanimated's `entering` / `exiting`. Exiting children automatically receive `pointerEvents: 'none'`.
- **`<MotionConfig reducedMotion>`** — `'user' | 'never' | 'always'` provider with `'user'` as the default. `useMotionConfig` and `useShouldReduceMotion` exposed for custom integrations.
- **`onAnimationEnd`** — `{ key, finished, value, target, phase, step, iteration }` payload. Transform-group keys (`translateX`/`translateY`, `scaleX`/`scaleY`) coalesce so a single `translate` step fires once, not once per axis.
- **Stable worklets, JS-thread resolver** — animate/transition objects compile to baked `withSpring` / `withTiming` / `withDecay` calls on the JS thread. Worklet bodies never iterate `Object.keys(...)` at frame time, and re-renders with unchanged values produce zero new UI-thread closures (regression-tested).
- **`createMotionComponent<C>()`** — public factory for custom primitives, with style inference from `C`'s `style` prop.
- **Docs** — Docusaurus site at `rootnative.github.io/inertia`; `llms.txt` and `llms-full.txt` shipped both on the docs site and in the npm tarball.

#### Known limitations

- SVG path morphing, gradient interpolation, and shared-element transitions across screens are out of scope until `0.2.x` / `1.x` per the roadmap.
- `react-native-gesture-handler` integration (drag, pan, swipe sub-states) lands in `0.2` via the optional `@rootnative/inertia-gestures` adapter.

## `@rootnative/inertia-gestures`

### [0.0.0-alpha.2] - 2026-07-20

#### Changed

- Published bundles no longer include sourcemaps, and the `__type-tests__` directories are excluded from the npm package (packaging-only; no runtime change).

### [0.0.0-alpha.1] - 2026-07-19

Lockstep version bump alongside `@rootnative/inertia@0.0.0-alpha.1` (README updates only; no runtime changes).

### 0.0.0-alpha.0

_No git tag was cut for this release; the published artifact is on npm as [`@rootnative/inertia-gestures@0.0.0-alpha.0`](https://www.npmjs.com/package/@rootnative/inertia-gestures/v/0.0.0-alpha.0). Unlinked here for that reason — every other heading resolves to a real tag._

Initial alpha publish alongside `@rootnative/inertia@0.0.0-alpha.0`. Optional adapter package wrapping `react-native-gesture-handler`; the core library has no required gesture-handler dependency.

#### Added

- `useDrag({ onRelease })` — release worklet returns per-axis Inertia transitions (snap-to-tick spring, decay with bounds, etc.). Velocity stays on the UI thread; no JS round-trip.
- `useSwipe`, `usePan` hooks composable with any `Motion.*` primitive via `<GestureDetector>`.

## `@rootnative/inertia-gradients`

### [0.0.0-alpha.2] - 2026-07-20

#### Changed

- Published bundles no longer include sourcemaps, and the `__type-tests__` directories are excluded from the npm package (packaging-only; no runtime change).

### [0.0.0-alpha.1] - 2026-07-19

Lockstep version bump alongside `@rootnative/inertia@0.0.0-alpha.1` (README updates only; no runtime changes).

### 0.0.0-alpha.0

_No git tag was cut for this release; the published artifact is on npm as [`@rootnative/inertia-gradients@0.0.0-alpha.0`](https://www.npmjs.com/package/@rootnative/inertia-gradients/v/0.0.0-alpha.0). Unlinked here for that reason — every other heading resolves to a real tag._

#### Added

- `MotionLinearGradient` over `expo-linear-gradient`. Accepts the same `initial` / `animate` / `transition` shape as the core `Motion.*` primitives, with animatable keys for `colors`, `start`, `end`, and `locations`.

## `@rootnative/inertia-svg`

### [0.0.0-alpha.2] - 2026-07-20

#### Added

- **`createMotionSvgComponent(Component, config)` factory** — wraps any `react-native-svg` element with the same `initial` / `animate` / `transition` surface as `MotionPath`. Config declares the animatable surface: `animatableProps` (numeric), `colorProps` (color strings), and `arrayProps` (numeric arrays, element-wise with the array length locked at mount — the same rule `MotionPath` applies to path commands). Per-key engagement is locked at mount; `transition` accepts named transitions from the nearest `<MotionConfig transitions>`, both top-level and per-property.
- **Prebuilt `MotionCircle` / `MotionRect` / `MotionLine`** shapes built on the factory, also reachable as `MotionSvg.Circle` / `.Rect` / `.Line`. `MotionCircle` animates `cx` / `cy` / `r` / `strokeWidth` / opacities / `strokeDashoffset` plus `fill` / `stroke`, and `strokeDasharray` element-wise — the progress-ring shape (`strokeDasharray` circumference + animated `strokeDashoffset`) works without any direct Reanimated imports.

### [0.0.0-alpha.1] - 2026-07-19

Lockstep version bump alongside `@rootnative/inertia@0.0.0-alpha.1` (README / `llms.txt` updates only; no runtime changes).

### 0.0.0-alpha.0

_No git tag was cut for this release; the published artifact is on npm as [`@rootnative/inertia-svg@0.0.0-alpha.0`](https://www.npmjs.com/package/@rootnative/inertia-svg/v/0.0.0-alpha.0). Unlinked here for that reason — every other heading resolves to a real tag._

#### Added

- `MotionPath` over `react-native-svg`. Animatable: `d` (element-wise scalar interpolation on structurally-compatible paths), `fill`, `stroke`, `strokeWidth`, opacities, `strokeDashoffset`. Source and target paths must share the same command sequence after implicit-repeat expansion; remount with `key` to switch shape.

[0.0.0-alpha.5]: https://github.com/rootnative/inertia/releases/tag/core+gestures+gradients+svg@0.0.0-alpha.5
[0.0.0-alpha.4]: https://github.com/rootnative/inertia/releases/tag/core+gestures+gradients+svg@0.0.0-alpha.4
[0.0.0-alpha.3]: https://github.com/rootnative/inertia/releases/tag/core+gestures+gradients+svg@0.0.0-alpha.3
[0.0.0-alpha.2]: https://github.com/rootnative/inertia/releases/tag/core+gestures+gradients+svg@0.0.0-alpha.2
[0.0.0-alpha.1]: https://github.com/rootnative/inertia/releases/tag/core+gestures+gradients+svg@0.0.0-alpha.1
