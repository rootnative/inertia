# Changelog

All notable changes to `@rootnative/inertia-svg` are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html). Pre-`1.0`, breaking changes may land in minor versions and are called out under their release.

This package ships in lockstep with `@rootnative/inertia` — version numbers track the core release that introduced or last touched the adapter.

## [Unreleased]

## [0.0.0-alpha.2] - 2026-07-20

### Added

- **`createMotionSvgComponent(Component, config)` factory** — wraps any `react-native-svg` element with the same `initial` / `animate` / `transition` surface as `MotionPath`. Config declares the animatable surface: `animatableProps` (numeric), `colorProps` (color strings), and `arrayProps` (numeric arrays, element-wise with the array length locked at mount — the same rule `MotionPath` applies to path commands). Per-key engagement is locked at mount; `transition` accepts named transitions from the nearest `<MotionConfig transitions>`, both top-level and per-property.
- **Prebuilt `MotionCircle` / `MotionRect` / `MotionLine`** shapes built on the factory, also reachable as `MotionSvg.Circle` / `.Rect` / `.Line`. `MotionCircle` animates `cx` / `cy` / `r` / `strokeWidth` / opacities / `strokeDashoffset` plus `fill` / `stroke`, and `strokeDasharray` element-wise — the progress-ring shape (`strokeDasharray` circumference + animated `strokeDashoffset`) works without any direct Reanimated imports.

## [0.0.0-alpha.1] - 2026-07-19

Lockstep version bump alongside `@rootnative/inertia@0.0.0-alpha.1` (README / `llms.txt` updates only; no runtime changes).

## [0.0.0-alpha.0]

### Added

- `MotionPath` over `react-native-svg`. Animatable: `d` (element-wise scalar interpolation on structurally-compatible paths), `fill`, `stroke`, `strokeWidth`, opacities, `strokeDashoffset`. Source and target paths must share the same command sequence after implicit-repeat expansion; remount with `key` to switch shape.

[unreleased]: https://github.com/rootnative/inertia/compare/core+gestures+gradients+svg@0.0.0-alpha.2...HEAD
[0.0.0-alpha.2]: https://github.com/rootnative/inertia/releases/tag/core+gestures+gradients+svg@0.0.0-alpha.2
[0.0.0-alpha.1]: https://github.com/rootnative/inertia/releases/tag/core+gestures+gradients+svg@0.0.0-alpha.1
[0.0.0-alpha.0]: https://github.com/rootnative/inertia/releases/tag/v0.0.0-alpha.0
