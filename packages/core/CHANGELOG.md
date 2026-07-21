# Changelog

All notable changes to `@rootnative/inertia` are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html). Pre-`1.0`, breaking changes may land in minor versions and are called out under their release.

## [Unreleased]

### Changed

- **Non-worklet transformers and easings now dev-warn.** `useTransform`'s transformer overload and custom `timing.easing` functions must be worklets (`'worklet'` directive as the first statement). The previous "plain functions are auto-wrapped" promise was unfulfillable: the directive-wrapped fallback closes over the opaque function reference, not the shared values read inside it, so Reanimated cannot extract dependencies (a `useTransform` derived value silently only refreshed on React re-renders — found via a frozen TextField label float in the UI library) and native builds reject the plain function when the closure is serialized to the UI thread. The fallback wrapper remains as a web-only best effort, but both sites now `console.warn` once in dev (suppressed under Jest, where the shared stubs report every function as non-worklet). Docs (`transitions.md`, `layout.md`, `api/hooks.md`) and docstrings corrected to state the real contract.

## [0.0.0-alpha.4] - 2026-07-21

### Fixed

- **First mouse click after page load no longer draws a focus ring** (web). The `focusVisibility` input-modality listeners attached lazily on the first `isFocusVisible()` call — which happens *during* the focus dispatch of that first click, after its `mousedown` had already passed unobserved — leaving the default `'keyboard'` modality and misclassifying the pointer interaction as keyboard focus. The listeners now install eagerly at module import (the lazy path remains as a safety net for environments where `document` appears after import).

## [0.0.0-alpha.3] - 2026-07-21

### Fixed

- **Named transitions resolve correctly across subpath entries.** `splitting: false` in the tsup config made every dist entry inline its own copy of `MotionConfigContext`, so the provider (root entry) and consumers (e.g. the `/gesture-layer` subpath) held different React contexts and every registered name silently fell back to the default spring. Dist now builds with code splitting so the context module is shared.

## [0.0.0-alpha.2] - 2026-07-20

### Added

- **`useGestureLayer` returns per-state progress** — the result now carries `states: GestureLayerProgress`, the five 0↔1 progress shared values behind the composed style (`hovered` / `focused` / `focusVisible` / `pressed` from the underlying `useGesture`, plus the hook-owned `disabled` progress). Lets styles derived from the same gesture wiring — an elevation crossfade via `useShadow({ from, to, progress: states.hovered })`, an icon tint — reuse the hook's progress values instead of duplicating the cascade through a parallel `useGesture` call. Purely additive; the exposed shared values are identity-stable across renders and are the same objects the worklet reads (treat as read-only — the handlers own the writes). The `GestureLayerProgress` type is exported from the `/gesture-layer` subpath.

### Changed

- Published bundles no longer include sourcemaps, and the `__type-tests__` directories are excluded from the npm package (packaging-only; no runtime change).

## [0.0.0-alpha.1] - 2026-07-19

### Added

- **Named transition registry** — `<MotionConfig transitions={{ name: TransitionConfig }}>` registers named transitions for the subtree; the name is accepted everywhere a `TransitionConfig` is: the `transition` prop (top-level, per-property, per gesture layer), the `layout` prop, and `useAnimation` / `useSpring` / `useBooleanSpring` / `useGesture` / `useGestureLayer`. Names resolve at the nearest provider; nested providers merge with child-overrides-per-name; unknown names warn in dev and fall back to the default spring. No presets ship — names are consumer vocabulary. New exports: `useNamedTransitions()`, `resolveNamedTransition()`, and the `TransitionName` / `TransitionInput` / `NamedTransitions` / `RegisteredTransitions` types (`RegisteredTransitions` is the augmentation point for compile-time-typed names).

- **`cubicBezier()` easing helper** — builds a `timing.easing` value from cubic-bezier control points as four numbers, as a W3C CSS `cubic-bezier(x1, y1, x2, y2)` string, or as a CSS keyword (`'linear'` / `'ease'` / `'ease-in'` / `'ease-out'` / `'ease-in-out'`). Makes CSS-format design-token easings directly consumable (pair with the named-transition registry). Invalid input throws: `x1` / `x2` must be finite and within `[0, 1]`; `step-*` keywords and the CSS `linear(...)` function are unsupported. The `EasingFunction` / `EasingFunctionFactory` / `EasingInput` types are now exported from the root barrel.

### Changed

- **Nested `<MotionConfig>` now inherits `reducedMotion`** from its ancestor when the prop is omitted (previously an inner provider silently reset the subtree to the `'user'` default). A transitions-only inner provider no longer clobbers an outer `reducedMotion="never"` / `"always"`.

## [0.0.0-alpha.0]

Initial alpha publish. The full v0.1 surface is in place; APIs are still subject to change before `0.1.0`.

### Added

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

### Known limitations

- SVG path morphing, gradient interpolation, and shared-element transitions across screens are out of scope until `0.2.x` / `1.x` per the roadmap.
- `react-native-gesture-handler` integration (drag, pan, swipe sub-states) lands in `0.2` via the optional `@rootnative/inertia-gestures` adapter.

[unreleased]: https://github.com/rootnative/inertia/compare/core+gestures+gradients+svg@0.0.0-alpha.2...HEAD
[0.0.0-alpha.2]: https://github.com/rootnative/inertia/releases/tag/core+gestures+gradients+svg@0.0.0-alpha.2
[0.0.0-alpha.1]: https://github.com/rootnative/inertia/releases/tag/core+gestures+gradients+svg@0.0.0-alpha.1
[0.0.0-alpha.0]: https://github.com/rootnative/inertia/releases/tag/v0.0.0-alpha.0
