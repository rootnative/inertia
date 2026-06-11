# Changelog

All notable changes to `@rootnative/inertia-svg` are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html). Pre-`1.0`, breaking changes may land in minor versions and are called out under their release.

This package ships in lockstep with `@rootnative/inertia` — version numbers track the core release that introduced or last touched the adapter.

## [Unreleased]

## [0.0.0-alpha.0]

### Added

- `MotionPath` over `react-native-svg`. Animatable: `d` (element-wise scalar interpolation on structurally-compatible paths), `fill`, `stroke`, `strokeWidth`, opacities, `strokeDashoffset`. Source and target paths must share the same command sequence after implicit-repeat expansion; remount with `key` to switch shape.

[unreleased]: https://github.com/rootnative/inertia/compare/v0.0.0-alpha.0...HEAD
[0.0.0-alpha.0]: https://github.com/rootnative/inertia/releases/tag/v0.0.0-alpha.0
