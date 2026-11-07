---
sidebar_position: 10
description: A manual harness for the Phase-3 acceptance bar, comparing Inertia against hand-rolled Reanimated on dropped frames.
---

# Perf bench

A manual harness for the Phase-3 acceptance bar:

> A virtualized-list row using `Motion.Pressable` with a `gesture` prop matches a hand-rolled `Pressable + useAnimatedStyle` row within 5% on Android dropped-frames (the moti #322 / #336 bar).

The **Perf bench** screen of the example app renders 1000 list rows with a press-state scale animation. A toggle switches the row implementation between Inertia (`Motion.Pressable` with `gesture`) and a hand-written equivalent (`Pressable` with `useSharedValue`, `useAnimatedStyle`, and `withSpring`). The spring physics are byte-identical, so the only difference is which library drives the shared value.

The harness uses the built-in `FlatList` of React Native, so it runs in Expo Go without a custom dev client. For the canonical moti #322 / #336 reproduction (those issues were against FlashList), swap `FlatList` for the `FlashList` of `@shopify/flash-list` in [example/screens/PerfBenchScreen.tsx](https://github.com/rootnative/inertia/blob/main/example/screens/PerfBenchScreen.tsx), and run a custom dev client (`pnpm --filter @rootnative/inertia-example exec expo run:android`). The row code is the same. Either way, the cost of the list virtualization stays the same for both row variants.

## What "within 5%" means

Run the same scroll motion on each variant on the same Android device. Read the dropped-frame count from PerfMonitor (or the JS profiler of React Native) for the duration of the scroll. The dropped-frame count of the Inertia variant must be **within 5%** of the hand-written one: `dropped_inertia <= dropped_handrolled * 1.05`.

If Inertia regresses past 5%, the abstraction leaks work onto the UI thread that the hand-written path avoids. That is a defect, not a tuning issue.

## How to run

1. **Use a real device.** A simulator doesn't reproduce the GPU and CPU pressure that causes frame drops. Use a mid-range Android device (for example, a Pixel 6a or older). Connect it over USB, so the PerfMonitor of React Native can attach.
2. **Make a release build.** Run `pnpm --filter @rootnative/inertia-example exec expo run:android --variant release`. The `android` script of the package only starts the dev server. A release build needs `expo run:android`. Hot reload and the inspector dominate the PerfMonitor numbers of a dev build, so those numbers don't track production behavior.
3. **Open the screen.** Tap **Perf bench** on the home screen of the example app. The default build uses `FlatList`. See the swap recipe above if you need the canonical FlashList reproduction.
4. **Enable PerfMonitor.** Open the dev menu (shake, or the volume keys), and enable "Perf Monitor". The JS frame rate and the UI frame rate appear as overlays.
5. **First pass, Inertia.** With the toggle on **Inertia**, scroll fast for about 10 seconds. Note the JS dropped-frame count and the UI dropped-frame count.
6. **Second pass, hand-written.** Toggle to **Hand-rolled**, and scroll for about 10 seconds with the same motion. Note the same two counts.
7. **Compare.**
   - JS thread: the count must be near zero on both. Neither variant runs JS per frame.
   - UI thread: this is where the bar applies. The Inertia count must be within 5% of the hand-written count.

## What this harness doesn't do, on purpose

- **No automated 5% assertion.** A real frame measurement needs a device, not CI. The harness is the reproducible part. A human makes the comparison.
- **No proxy metrics on the JS side.** A `requestAnimationFrame` count on the JS thread doesn't capture UI-thread drops, and those are the actual bar. A fake JS-side metric would give a false sense of CI coverage.
- **No iOS run.** iOS rarely drops frames at this list size. The bar is Android-specific.

## When the bar gets violated

The two paths are:

- **Inertia row:** `Motion.Pressable gesture={{ pressed: { scale: 0.96 } }} transition={{ type: 'spring', tension: 320, friction: 22 }}`.
- **Hand-written row:** `Pressable` with a manual `useSharedValue(0)` toggle, and a `useAnimatedStyle` that reads `withSpring(1 - pressed.value * 0.04, { stiffness: 320, damping: 22 })`.

If Inertia regresses, suspect these causes, in this order:

1. A new worklet per render. The worklet must be memoized through `baseSig` and `transitionSig`. Check the [memoization regression test](https://github.com/rootnative/inertia/blob/main/packages/core/src/__tests__/memoization.test.tsx) again.
2. The cost of the animated style. Make sure that the worklet body doesn't allocate per frame.
3. The cost of the resolver. `resolveAnimatableValue` runs on the JS thread, per render and not per frame. Check the effect dependency array.
