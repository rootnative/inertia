# Changelog

All notable changes to `@rootnative/inertia-gestures` are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html). Pre-`1.0.0`, breaking changes may land in minor versions and are called out under their release.

This package ships in lockstep with `@rootnative/inertia` — version numbers track the core release that introduced or last touched the adapter.

## [Unreleased]

## [0.0.9] - 2026-08-22

**Lockstep version bump** alongside `@rootnative/inertia@0.0.9` (`useInterpolatedStyle` types its return against the map it was given, so a `style` array no longer needs a cast). No runtime changes in this adapter; the `@rootnative/inertia` peer range moves to `>=0.0.9`.

## [0.0.8] - 2026-08-16

### Added

- **`useSwipe` snap-back is configurable: `releaseTransition`.** The reset to zero after a release was a hard-coded `withSpring(0)` — it could not join a design-token motion system, and it dropped the release velocity, so a flick that stopped short of the threshold reset as if the finger had been still. The option accepts a spring / timing / no-animation config inline, or a `TransitionName` registered on the nearest `<MotionConfig transitions={...}>`. The release velocity is passed into a spring automatically (unless the config sets `velocity` itself), on both the default spring and a configured one. Decay is excluded — the snap-back always targets zero and decay has no target; a name that resolves to a decay config dev-warns and falls back to the default spring.

- **`useSwipe` commit exit: `onCommit` + `onSwipeEnd`.** The hook always sprang back to zero, which is right for swipe-to-delete and wrong for a card deck — a committed card must continue in the swipe direction and leave the screen, and consumers were rebuilding that with a parallel translation layer, an animation-end handler, and a safety timer. `onCommit` is a UI-thread worklet that fires when the gesture commits and returns per-axis release transitions (the same `ReleaseResult` shape as `useDrag`'s `onRelease`) to run **instead of** the snap-back; an omitted axis or a `void` return snaps back as usual. `onSwipeEnd(direction, { finished })` fires on the JS thread when the committed swipe's release animation settles — the commit exit if one ran, the snap-back otherwise — which is the "card is gone, advance the deck" moment `onSwipe` (fired at release) cannot give. It does not fire for a release that did not commit.

- **`useSwipe` returns `reset()`.** Snaps both shared values back to zero with no animation, cancelling anything in flight. After a commit exit the values stay at the exit target; call `reset()` when the next card takes over the same mounted component. A keyed remount gets fresh values and doesn't need it.

- New exported type: `SnapBackTransition` (the `releaseTransition` shapes). Requires `@rootnative/inertia` >=0.0.8 — the settle callback rides a new third parameter on core's `buildReleaseAnimation`.

## [0.0.7] - 2026-08-14

**Lockstep version bump** alongside `@rootnative/inertia@0.0.7` (`Motion.FlatList`, a virtualized animated scroller, and `gesture={{ pressed }}` responding to a mouse on web). No runtime changes in this adapter; the `@rootnative/inertia` peer range moves to `>=0.0.7`.

## [0.0.6] - 2026-08-08

**Lockstep version bump** alongside `@rootnative/inertia@0.0.6` (`boxShadow` animates under the default spring transition, and colour keys can animate away from their resting default). No runtime changes in this adapter; the `@rootnative/inertia` peer range moves to `>=0.0.6`.

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

_No git tag was cut for this release; the published artifact is on npm as [`@rootnative/inertia-gestures@0.0.0-alpha.0`](https://www.npmjs.com/package/@rootnative/inertia-gestures/v/0.0.0-alpha.0). Unlinked here for that reason — every other heading resolves to a real tag._

Initial alpha publish alongside `@rootnative/inertia@0.0.0-alpha.0`. Optional adapter package wrapping `react-native-gesture-handler`; the core library has no required gesture-handler dependency.

### Added

- `useDrag({ onRelease })` — release worklet returns per-axis Inertia transitions (snap-to-tick spring, decay with bounds, etc.). Velocity stays on the UI thread; no JS round-trip.
- `useSwipe`, `usePan` hooks composable with any `Motion.*` primitive via `<GestureDetector>`.

[unreleased]: https://github.com/rootnative/inertia/compare/core+gestures+gradients+svg@0.0.9...HEAD
[0.0.9]: https://github.com/rootnative/inertia/releases/tag/core+gestures+gradients+svg@0.0.9
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
