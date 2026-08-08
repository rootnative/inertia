# Changelog

All notable changes to `@rootnative/inertia-svg` are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html). Pre-`1.0.0`, breaking changes may land in minor versions and are called out under their release.

This package ships in lockstep with `@rootnative/inertia` — version numbers track the core release that introduced or last touched the adapter.

## [Unreleased]

## [0.0.6] - 2026-08-08

**Version bump alongside `@rootnative/inertia@0.0.6`, and this adapter carries half of that release's colour fix.** It seeded its own colour slots from the same unanimatable spelling, so the defect reached `MotionPath` independently of core. The `@rootnative/inertia` peer range moves to `>=0.0.6`.

### Fixed

- **A colour prop engaged only through `animate` now animates.** `fill`, `stroke`, and any key listed in `colorProps` seeded from `'transparent'` when neither a static prop nor `initial` supplied a value — and `'transparent'` is the one CSS colour name Reanimated's `isColor()` rejects, so the slot could not be animated away from. Under `type: 'timing'` the target still arrived when the duration elapsed, hiding it; under the default spring the animation never settled and the colour never appeared. Seeds are now `TRANSPARENT` (`'rgba(0, 0, 0, 0)'`), the same colour in a spelling Reanimated recognises. Affects `MotionPath`'s `fill` / `stroke` and every component built with `createMotionSvgComponent`. See the core changelog for the full mechanism.

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

### Added

- **`createMotionSvgComponent(Component, config)` factory** — wraps any `react-native-svg` element with the same `initial` / `animate` / `transition` surface as `MotionPath`. Config declares the animatable surface: `animatableProps` (numeric), `colorProps` (color strings), and `arrayProps` (numeric arrays, element-wise with the array length locked at mount — the same rule `MotionPath` applies to path commands). Per-key engagement is locked at mount; `transition` accepts named transitions from the nearest `<MotionConfig transitions>`, both top-level and per-property.
- **Prebuilt `MotionCircle` / `MotionRect` / `MotionLine`** shapes built on the factory, also reachable as `MotionSvg.Circle` / `.Rect` / `.Line`. `MotionCircle` animates `cx` / `cy` / `r` / `strokeWidth` / opacities / `strokeDashoffset` plus `fill` / `stroke`, and `strokeDasharray` element-wise — the progress-ring shape (`strokeDasharray` circumference + animated `strokeDashoffset`) works without any direct Reanimated imports.

## [0.0.0-alpha.1] - 2026-07-19

Lockstep version bump alongside `@rootnative/inertia@0.0.0-alpha.1` (README / `llms.txt` updates only; no runtime changes).

## 0.0.0-alpha.0

_No git tag was cut for this release; the published artifact is on npm as [`@rootnative/inertia-svg@0.0.0-alpha.0`](https://www.npmjs.com/package/@rootnative/inertia-svg/v/0.0.0-alpha.0). Unlinked here for that reason — every other heading resolves to a real tag._

### Added

- `MotionPath` over `react-native-svg`. Animatable: `d` (element-wise scalar interpolation on structurally-compatible paths), `fill`, `stroke`, `strokeWidth`, opacities, `strokeDashoffset`. Source and target paths must share the same command sequence after implicit-repeat expansion; remount with `key` to switch shape.

[unreleased]: https://github.com/rootnative/inertia/compare/core+gestures+gradients+svg@0.0.6...HEAD
[0.0.6]: https://github.com/rootnative/inertia/releases/tag/core+gestures+gradients+svg@0.0.6
[0.0.5]: https://github.com/rootnative/inertia/releases/tag/core+gestures+gradients+svg@0.0.5
[0.0.4]: https://github.com/rootnative/inertia/releases/tag/core+gestures+gradients+svg@0.0.4
[0.0.3]: https://github.com/rootnative/inertia/releases/tag/core+gestures+gradients+svg@0.0.3
[0.0.2]: https://github.com/rootnative/inertia/releases/tag/core+gestures+gradients+svg@0.0.2
[0.0.1]: https://github.com/rootnative/inertia/releases/tag/core+gestures+gradients+svg@0.0.1
[0.0.0-alpha.2]: https://github.com/rootnative/inertia/releases/tag/core+gestures+gradients+svg@0.0.0-alpha.2
[0.0.0-alpha.1]: https://github.com/rootnative/inertia/releases/tag/core+gestures+gradients+svg@0.0.0-alpha.1
