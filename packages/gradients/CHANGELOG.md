# Changelog

All notable changes to `@rootnative/inertia-gradients` are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html). Pre-`1.0.0`, breaking changes may land in minor versions and are called out under their release.

This package ships in lockstep with `@rootnative/inertia` — version numbers track the core release that introduced or last touched the adapter.

## [Unreleased]

## [0.0.8] - 2026-08-16

**Lockstep version bump** alongside `@rootnative/inertia@0.0.8` (`<Stagger>`, parent-owned per-child delays for cascading list entrances, and a settle callback on `buildReleaseAnimation`). No runtime changes in this adapter; the `@rootnative/inertia` peer range moves to `>=0.0.8`.

## [0.0.7] - 2026-08-14

**Lockstep version bump** alongside `@rootnative/inertia@0.0.7` (`Motion.FlatList`, a virtualized animated scroller, and `gesture={{ pressed }}` responding to a mouse on web). No runtime changes in this adapter; the `@rootnative/inertia` peer range moves to `>=0.0.7`.

## [0.0.6] - 2026-08-08

**Lockstep version bump** alongside `@rootnative/inertia@0.0.6` (`boxShadow` animates under the default spring transition, and colour keys can animate away from their resting default). This adapter was checked against both defects and is unaffected: it drives one shared value per colour slot, so no colour ever reaches Reanimated inside an array, and every slot is seeded from a real colour rather than a resting default. No runtime changes; the `@rootnative/inertia` peer range moves to `>=0.0.6`.

## [0.0.5] - 2026-07-31

**Lockstep version bump** alongside `@rootnative/inertia@0.0.5` (40 layout and text-metric keys join the `animate` surface, `AnimateStyle<C>` narrows to reject keys the runtime doesn't drive, and reduced motion is no longer bypassable by a sequence step's own `type`). No runtime changes in this adapter; the `@rootnative/inertia` peer range moves to `>=0.0.5`.

## [0.0.4] - 2026-07-29

**Lockstep version bump** alongside `@rootnative/inertia@0.0.4` (`boxShadow` on the `animate` surface, plus window-coordinate measurement and a style carry for `layoutId` shared-element transitions). No runtime changes in this adapter; the `@rootnative/inertia` peer range moves to `>=0.0.4`.

## [0.0.3] - 2026-07-25

**Lockstep version bump** alongside `@rootnative/inertia@0.0.3` (correctness fixes to the resting-value base, `<Presence>` ordering and unmount, endless-repeat completion counters, `useColorCascade`, `useAnimator`, and the `layoutId` registry). No runtime changes in this adapter; the `@rootnative/inertia` peer range moves to `>=0.0.3`.

## [0.0.2] - 2026-07-24

**Lockstep version bump** alongside `@rootnative/inertia@0.0.2` (the value-layer interpolation hooks). No runtime changes in this adapter; the `@rootnative/inertia` peer range moves to `>=0.0.2`.

## [0.0.1] - 2026-07-23

**First stable release.** Lockstep version bump alongside `@rootnative/inertia@0.0.1` (the first stable release of the core). No runtime changes in this adapter since `0.0.0-alpha.2`.

## [0.0.0-alpha.2] - 2026-07-20

### Changed

- Published bundles no longer include sourcemaps, and the `__type-tests__` directories are excluded from the npm package (packaging-only; no runtime change).

## [0.0.0-alpha.1] - 2026-07-19

Lockstep version bump alongside `@rootnative/inertia@0.0.0-alpha.1` (README updates only; no runtime changes).

## 0.0.0-alpha.0

_No git tag was cut for this release; the published artifact is on npm as [`@rootnative/inertia-gradients@0.0.0-alpha.0`](https://www.npmjs.com/package/@rootnative/inertia-gradients/v/0.0.0-alpha.0). Unlinked here for that reason — every other heading resolves to a real tag._

### Added

- `MotionLinearGradient` over `expo-linear-gradient`. Accepts the same `initial` / `animate` / `transition` shape as the core `Motion.*` primitives, with animatable keys for `colors`, `start`, `end`, and `locations`.

[unreleased]: https://github.com/rootnative/inertia/compare/core+gestures+gradients+svg@0.0.8...HEAD
[0.0.8]: https://github.com/rootnative/inertia/releases/tag/core+gestures+gradients+svg@0.0.8
[0.0.7]: https://github.com/rootnative/inertia/releases/tag/core+gestures+gradients+svg@0.0.7
[0.0.6]: https://github.com/rootnative/inertia/releases/tag/core+gestures+gradients+svg@0.0.6
[0.0.5]: https://github.com/rootnative/inertia/releases/tag/core+gestures+gradients+svg@0.0.5
[0.0.4]: https://github.com/rootnative/inertia/releases/tag/core+gestures+gradients+svg@0.0.4
[0.0.3]: https://github.com/rootnative/inertia/releases/tag/core+gestures+gradients+svg@0.0.3
[0.0.2]: https://github.com/rootnative/inertia/releases/tag/core+gestures+gradients+svg@0.0.2
[0.0.1]: https://github.com/rootnative/inertia/releases/tag/core+gestures+gradients+svg@0.0.1
[0.0.0-alpha.2]: https://github.com/rootnative/inertia/releases/tag/core+gestures+gradients+svg@0.0.0-alpha.2
[0.0.0-alpha.1]: https://github.com/rootnative/inertia/releases/tag/core+gestures+gradients+svg@0.0.0-alpha.1
