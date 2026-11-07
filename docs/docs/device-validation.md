---
sidebar_position: 11
description: The run procedure for the five behaviors CI cannot validate, because the Jest mock resolves animations synchronously by design.
---

# Device validation checklist

Five features shipped between `0.0.1` and `0.0.9` that CI can't validate. The Jest mock resolves animations **synchronously by design**: `withSpring` is the identity function, and `useAnimatedStyle` runs once per call with no frame loop. So no test can observe a dropped frame, a colour crossfade at 60 Hz, or whether a native measurement resolved in time. Every item below is green in CI and unproven on hardware.

This page is the run procedure. Complete it in **one sitting with two physical devices** (one Android, one iOS), and check the items off in place. Record the findings in the results table at the bottom. Then copy them into the standing-items bullet in the design contract, so the next audit doesn't derive the list again.

## Before you start

**Two physical devices.** A simulator doesn't reproduce the GPU and CPU pressure that causes frame drops. More important for items 3 and 4, the iOS simulator and the Android emulator don't reproduce the native measurement timing. A mid-range Android device (a Pixel 6a or older) is the more valuable of the two. That is where drops appear first.

**Release builds, not the dev server.** Hot reload and the inspector dominate the frame numbers of a dev build:

```bash
# Android
pnpm --filter @rootnative/inertia-example exec expo run:android --variant release
# iOS
pnpm --filter @rootnative/inertia-example exec expo run:ios --configuration Release
```

The own `android` and `ios` scripts of the package only start the dev server (`expo start --android`). That is not what you want for items 1 and 5.

**One caveat limits what items 3 and 4 can prove.** The example app uses **manual routing** (`App.tsx` switches on a `route` string) and has **no navigator dependency**. So the current screens can't fully answer whether the synchronous `measureInWindow` of Fabric holds inside a real navigator transition. See item 3 for what you _can_ establish and what stays open.

## 1. FlatList / FlashList dropped-frame parity (open since `0.0.1`)

**The bar**, the moti #322 / #336 acceptance criterion:

> A virtualized-list row using `Motion.Pressable` with a `gesture` prop matches a hand-rolled `Pressable + useAnimatedStyle` row within 5% on Android dropped-frames.

The full procedure already exists. Follow **[Perf bench](./perf-bench)** instead of a copy here. In short: open **Perf bench**, enable PerfMonitor from the dev menu, scroll hard for about 10 s on the **Inertia** toggle, then repeat the same motion on **Hand-rolled**, and compare the UI-thread drops. The pass condition is `dropped_inertia <= dropped_handrolled * 1.05`.

Three things to know before you run it:

- The screen ships with **`FlatList`**, so it runs in Expo Go. The canonical moti reproduction was against **FlashList**. The swap is one import plus one tag change in [PerfBenchScreen.tsx](https://github.com/rootnative/inertia/blob/main/example/screens/PerfBenchScreen.tsx), but FlashList needs a custom dev client. Run `FlatList` first. If Inertia is within 5% there, the swap confirms the result instead of a new finding.
- JS-thread drops must be near zero on **both** variants. If they aren't, something runs JS per frame, and that masks the UI-thread comparison. Diagnose that first.
- Since `0.0.7`, the library ships **`Motion.FlatList`** (`@rootnative/inertia/flat-list`). The bar below is about a `Motion.Pressable` **row** inside a virtualized list, so that doesn't change it. But if you rebuild the bench screen on `Motion.FlatList`, record which scroller each number came from.

**Android only.** iOS doesn't drop frames at this list size, so a green iOS run proves nothing.

- [ ] Android: Inertia UI drops ▁▁▁ · hand-rolled ▁▁▁ · ratio ▁▁▁ (pass if ≤ 1.05)

## 2. `boxShadow` — multi-layer springs and `inset` on native (since `0.0.4`)

Screen: **boxShadow**. There are two separate questions, and the second one is the more likely problem.

:::info This item already found one defect
The first Android session on this screen found that `boxShadow` didn't animate at all under `type: 'spring'`, the default, while it worked under `type: 'timing'`. The cause was the shape of the payload that Inertia passed to Reanimated. It's fixed. See the core changelog. So the checks below are a **re-validation**, not a first validation, and the spring boxes matter more than the rest of this page.
:::

**Multi-layer spring interpolation.** Tap **Raise all**. The first card animates a one-layer shadow to a two-layer shadow, so the padded transparent layer fades in and doesn't pop. Every length and colour of every layer springs on its own.

- [ ] The shadow animates **at all** under a spring. This is the regression check.
- [ ] The extra layer **fades in**, with no pop and no flash of an opaque shadow.
- [ ] No visible banding or stepping while the blur radius springs.
- [ ] An under-damped overshoot (spring, `tension: 160`) doesn't make the two layers visibly separate into a doubled edge.
- [ ] The animation **finishes**: an `onAnimationEnd` on the card fires. A spring that never settles is invisible until something waits on it (a chained step, an `exit` inside `<Presence>`).

**`inset` rendering.** This is the platform-risk item. Native support for `inset` box shadows is patchy, and the flag travels as a _static_ value per layer, not an interpolated one.

- [ ] **iOS:** the inset card renders an _inner_ shadow, not an outer one.
- [ ] **Android:** the same. If the inset renders as an outer shadow or not at all, that is a **native limitation to document**, not a defect to fix in the resolver. Record the OS version.
- [ ] A toggle between a deep and a shallow inset animates the blur and the offset, and the shadow doesn't flip between inside and outside in flight.

## 3. `layoutId` window-coordinate measurement (since `0.0.4`)

Screen: **Shared element transition (layoutId)**. This item has the most subtle failure mode of the five, because in the easy case the fallback path is _silent and looks correct_.

**Baseline, no offset parent.** Tap a grid card. The card must stay on the tile as it grows into the detail header.

- [ ] iOS: the transition starts exactly at the tapped tile.
- [ ] Android: the same.

**The real test, an offset parent.** Tap **Offset the detail container**, then tap a card. This puts the source and the target under parents at different window offsets, which is exactly what parent-relative coordinates got wrong.

- [ ] iOS (Fabric): still on the tile. **If it lands short by the padding of the container, window measurement isn't happening, and the parent-relative fallback is in use.** That is the finding, and it means that `measureInWindow` didn't resolve synchronously on this platform and version.
- [ ] Android (Fabric): the same.

**Scroll drift.** The new measurement at the first layout of the target exists because `onLayout` never fires for the scroll of an _ancestor_. Scroll the grid so a card is far from where it first laid out, then tap it.

- [ ] The transition starts at the **current** on-screen position of the card, not its original one.

**What stays open whatever the result.** The example app has no navigator, so this exercises a conditional re-render, not a stack transition. The open question is whether the new measurement of the source lands _before_ a navigator starts to translate the outgoing screen. To answer it, add a navigator to the example app, or use a validation consumer that has one. If the items above pass, change the status from "unvalidated" to "validated outside a navigator; navigator case still open". Don't close it.

## 4. `layoutId` style carry (since `0.0.4`)

The same screen. Each card uses a darker detail shade on purpose, so the crossfade is visible.

- [ ] The background colour **crossfades** over the transition, and doesn't snap at either end.
- [ ] The colour blend and the rect FLIP finish **together**. One that lags the other is the specific thing to watch for. A spring-driven rect and a progress-driven colour can visibly diverge, even though they share the same transition config.
- [ ] The corner radius interpolates smoothly where the source and the target differ.
- [ ] No frame where the arriving element shows _neither_ style (a flash of the default or of transparent).
- [ ] Enable reduce motion in the OS, and repeat: the rect **and** the style snap together. Half a transition that degrades is worse than none.

## 5. Layout keys — reflow cost (since `0.0.5`)

Screen: **Layout keys**. It's built for this comparison: each layout key sits next to its transform equivalent, so the frame cost is directly visible.

Enable PerfMonitor, then toggle **Animate** several times, and watch the UI-thread counter per row.

- [ ] **`paddingHorizontal` vs `scaleX`.** Both reach a similar end state. The padding card reflows. The scale card composites. Expect the padding card to be measurably worse on Android. **How much** worse is the number to record, because it justifies the "prefer transforms" guidance in the docs.
- [ ] **`left` vs `translateX`.** The two bars must stay aligned _throughout_, not only at the ends. A divergence in flight means that the inset path conflicts with the layout of a parent.
- [ ] **`fontSize` vs `scale`.** The `fontSize` label measures the text run again on each frame and pushes its siblings. The scaled label overlaps. Confirm that the label that reflows is the one that moves the content around it.
- [ ] **Per-corner radii.** Four independent shared values. Under the tight spring of the screen (`friction: 20`), they must stay in sync. Loosen it to `friction: 8` in the screen source, and confirm that they _do_ go out of sync. That is why the default is tight, and it's worth one look.
- [ ] **`flex` split.** Two panes trade space. This case has no transform equivalent, so a bad number here means "document the cost", not "use transforms instead".
- [ ] The Android reflow cost isn't so high that a common case (a button that grows its padding on press) drops frames on a mid-range device.

## Recording results

Fill this in during the run, then copy the findings into the standing device-validation bullet in the design contract. **A number is worth more than a checkmark.** "Inertia 12 drops vs hand-rolled 11, ratio 1.09, fails" is actionable. "item 1 ✗" is not.

| Item                       | Android | iOS | Notes / numbers |
| -------------------------- | ------- | --- | --------------- |
| 1 · FlatList frame parity  | ▁▁▁     | n/a |                 |
| 1b · FlashList (optional)  | ▁▁▁     | n/a |                 |
| 2 · boxShadow multi-layer  | ▁▁▁     | ▁▁▁ |                 |
| 2b · boxShadow `inset`     | ▁▁▁     | ▁▁▁ |                 |
| 3 · layoutId window coords | ▁▁▁     | ▁▁▁ |                 |
| 3b · layoutId scroll drift | ▁▁▁     | ▁▁▁ |                 |
| 4 · layoutId style carry   | ▁▁▁     | ▁▁▁ |                 |
| 5 · layout-key reflow cost | ▁▁▁     | ▁▁▁ |                 |

Device / OS versions used: ▁▁▁

**If something fails**, open a defect with the recorded numbers. Don't fix it inside the validation session. A fix with no second measurement is unverified in exactly the way that this page exists to prevent. The one exception is the `inset` rendering of item 2: a native platform limitation is a **documentation** outcome, not a defect.
