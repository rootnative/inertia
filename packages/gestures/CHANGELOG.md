# Changelog

All notable changes to `@rootnative/inertia-gestures` are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html). Pre-`1.0`, breaking changes may land in minor versions and are called out under their release.

This package ships in lockstep with `@rootnative/inertia` — version numbers track the core release that introduced or last touched the adapter.

## [Unreleased]

## [0.0.1-alpha.6] — 2026-05-22

### Added

- `useDrag({ onRelease })` — release worklet returns per-axis Inertia transitions (snap-to-tick spring, decay with bounds, etc.). Velocity stays on the UI thread; no JS round-trip.
- `useSwipe`, `usePan` hooks composable with any `Motion.*` primitive via `<GestureDetector>`.

## [0.0.1-alpha.0] — 2026-05-07

Initial alpha publish alongside `@rootnative/inertia@0.0.1-alpha.0`. Optional adapter package wrapping `react-native-gesture-handler`; the core library has no required gesture-handler dependency.

[unreleased]: https://github.com/rootnative/inertia/compare/v0.0.1-alpha.6...HEAD
[0.0.1-alpha.6]: https://github.com/rootnative/inertia/releases/tag/v0.0.1-alpha.6
[0.0.1-alpha.0]: https://github.com/rootnative/inertia/releases/tag/v0.0.1-alpha.0
