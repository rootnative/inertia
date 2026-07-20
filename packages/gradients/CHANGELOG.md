# Changelog

All notable changes to `@rootnative/inertia-gradients` are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html). Pre-`1.0`, breaking changes may land in minor versions and are called out under their release.

This package ships in lockstep with `@rootnative/inertia` — version numbers track the core release that introduced or last touched the adapter.

## [Unreleased]

## [0.0.0-alpha.2] - 2026-07-20

### Changed

- Published bundles no longer include sourcemaps, and the `__type-tests__` directories are excluded from the npm package (packaging-only; no runtime change).

## [0.0.0-alpha.1] - 2026-07-19

Lockstep version bump alongside `@rootnative/inertia@0.0.0-alpha.1` (README updates only; no runtime changes).

## [0.0.0-alpha.0]

### Added

- `MotionLinearGradient` over `expo-linear-gradient`. Accepts the same `initial` / `animate` / `transition` shape as the core `Motion.*` primitives, with animatable keys for `colors`, `start`, `end`, and `locations`.

[unreleased]: https://github.com/rootnative/inertia/compare/core+gestures+gradients+svg@0.0.0-alpha.2...HEAD
[0.0.0-alpha.2]: https://github.com/rootnative/inertia/releases/tag/core+gestures+gradients+svg@0.0.0-alpha.2
[0.0.0-alpha.1]: https://github.com/rootnative/inertia/releases/tag/core+gestures+gradients+svg@0.0.0-alpha.1
[0.0.0-alpha.0]: https://github.com/rootnative/inertia/releases/tag/v0.0.0-alpha.0
