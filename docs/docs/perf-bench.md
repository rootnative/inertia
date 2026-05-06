---
sidebar_position: 10
---

# Perf bench

A manual harness for the Phase-3 acceptance bar:

> A virtualized-list row using `Motion.Pressable` with a `gesture` prop matches a hand-rolled `Pressable + useAnimatedStyle` row within 5% on Android dropped-frames (the moti #322 / #336 bar).

The example app's **Perf bench** screen renders 1000 list rows with a press-state scale animation. A toggle flips the row implementation between Inertia (`Motion.Pressable` + `gesture`) and a hand-rolled equivalent (`Pressable` + `useSharedValue` + `useAnimatedStyle` + `withSpring`). The spring physics are byte-identical so the only difference is which library drives the shared value.

The harness uses React Native's built-in `FlatList` so it runs in Expo Go without a custom dev client. For the canonical moti #322 / #336 reproduction (the issues were against FlashList specifically), swap `FlatList` → `@shopify/flash-list`'s `FlashList` in [example/screens/PerfBenchScreen.tsx](https://github.com/onlynative/inertia/blob/main/example/screens/PerfBenchScreen.tsx) and run a custom dev client (`pnpm --filter @onlynative/inertia-example android`). Same row code; the list-virtualization tax is held constant across both row variants either way.

## What "within 5%" means

Run the same scroll motion on each variant on the same Android device. Read the dropped-frame count off PerfMonitor (or React Native's JS profiler) for the duration of the scroll. The Inertia variant's dropped-frame count should be **within 5%** of the hand-rolled one — i.e. `dropped_inertia <= dropped_handrolled * 1.05`.

If Inertia regresses past 5%, the abstraction is leaking work onto the UI thread that the hand-rolled path avoids — that's a bug, not a tuning issue.

## How to run

1. **Real device.** Simulators don't reproduce the GPU/CPU pressure that surfaces frame drops. Use a mid-range Android (e.g. Pixel 6a or older). Plug into USB so React Native's PerfMonitor can attach.
2. **Release build.** `pnpm --filter @onlynative/inertia-example android --variant release`. PerfMonitor numbers from the dev build are dominated by hot-reload and inspector overhead and won't track production behavior.
3. **Open the screen.** Tap **Perf bench (FlashList)** on the example app's home.
4. **Enable PerfMonitor.** Open the dev menu (shake / volume keys), enable "Perf Monitor". JS frame rate and UI frame rate appear as overlays.
5. **First pass — Inertia.** With the toggle on **Inertia**, scroll fast for ~10 seconds. Note the JS dropped-frame count and the UI dropped-frame count.
6. **Second pass — hand-rolled.** Toggle to **Hand-rolled**, scroll for ~10 seconds with the same motion. Note the same two counts.
7. **Compare.**
   - JS thread: should be near zero on both — neither variant runs JS per frame.
   - UI thread: this is where the bar applies. Inertia's count must be within 5% of hand-rolled's.

## What this harness deliberately doesn't do

- **No automated 5% assertion.** Real frame measurement needs a device, not CI. The harness is the reproducible part; the comparison is human-driven.
- **No JS-side proxy metrics.** `requestAnimationFrame` counts on the JS thread don't capture UI-thread drops, which is the actual bar. Adding a fake JS-side metric would give a false sense of CI coverage.
- **No iOS run.** iOS rarely drops frames at this list size; the bar is Android-specific.

## When the bar gets violated

The two paths are:

- **Inertia row** — `Motion.Pressable gesture={{ pressed: { scale: 0.96 } }} transition={{ type: 'spring', tension: 320, friction: 22 }}`.
- **Hand-rolled row** — `Pressable` with manual `useSharedValue(0)` toggling, `useAnimatedStyle` reading `withSpring(1 - pressed.value * 0.04, { stiffness: 320, damping: 22 })`.

If Inertia regresses, suspect (in this order):

1. Worklet recreation per render — should be memoized via `mergedSig` / `transitionSig`. Re-check the [memoization regression test](https://github.com/onlynative/inertia/blob/main/packages/core/src/__tests__/memoization.test.tsx).
2. Animated style cost — ensure the worklet body doesn't allocate per frame.
3. Resolver cost — `resolveAnimatableValue` runs on the JS thread, but per-render not per-frame. Check the effect dep array.
