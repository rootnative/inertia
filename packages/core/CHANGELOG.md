# Changelog

All notable changes to `@rootnative/inertia` are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html). Pre-`1.0`, breaking changes may land in minor versions and are called out under their release.

## [Unreleased]

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

[unreleased]: https://github.com/rootnative/inertia/compare/v0.0.0-alpha.0...HEAD
[0.0.0-alpha.0]: https://github.com/rootnative/inertia/releases/tag/v0.0.0-alpha.0
