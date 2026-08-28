---
sidebar_position: 11
description: The run procedure for the five behaviors CI cannot validate, because the Jest mock resolves animations synchronously by design.
---

# Device validation checklist

Five features have shipped across `0.0.1`–`0.0.9` that CI cannot validate. The Jest mock resolves animations **synchronously by design** — `withSpring` is the identity function and `useAnimatedStyle` runs once per call with no frame loop — so no amount of test-writing observes a dropped frame, a colour crossfade at 60 Hz, or whether a native measurement resolved in time. Every item below is green in CI and unproven on hardware.

This page is the run procedure. It is written to be completed in **one sitting with two physical devices** (one Android, one iOS), and to be checked off in place: record findings in the results table at the bottom, then mirror them into the standing-items bullet in the design contract so the next audit doesn't re-derive the list.

## Before you start

**Two physical devices.** Simulators do not reproduce the GPU/CPU pressure that surfaces frame drops, and — more importantly for items 3 and 4 — the iOS simulator and Android emulator do not faithfully reproduce native measurement timing. A mid-range Android (Pixel 6a or older) is the more valuable of the two; that is where drops appear first.

**Release builds, not the dev server.** Dev-build frame numbers are dominated by hot-reload and inspector overhead:

```bash
# Android
pnpm --filter @rootnative/inertia-example exec expo run:android --variant release
# iOS
pnpm --filter @rootnative/inertia-example exec expo run:ios --configuration Release
```

The package's own `android` / `ios` scripts only start the dev server (`expo start --android`), which is not what you want for items 1 and 5.

**One caveat that shapes what items 3 and 4 can actually prove:** the example app uses **manual routing** — `App.tsx` switches on a `route` string — and takes **no navigator dependency**. So "does Fabric's synchronous `measureInWindow` hold inside a real navigator transition" cannot be fully answered by the current screens. See item 3 for what you _can_ establish and what stays open.

## 1. FlatList / FlashList dropped-frame parity (open since `0.0.1`)

**The bar** — the moti #322 / #336 acceptance criterion:

> A virtualized-list row using `Motion.Pressable` with a `gesture` prop matches a hand-rolled `Pressable + useAnimatedStyle` row within 5% on Android dropped-frames.

The full procedure already exists — follow **[Perf bench](./perf-bench)** rather than duplicating it here. In short: open **Perf bench**, enable PerfMonitor from the dev menu, scroll hard for ~10 s on the **Inertia** toggle, then repeat the same motion on **Hand-rolled**, and compare UI-thread drops. Pass is `dropped_inertia <= dropped_handrolled * 1.05`.

Three things worth knowing before you run it:

- The screen ships with **`FlatList`** so it runs in Expo Go. The canonical moti reproduction was against **FlashList**; swapping is one import plus one tag change in [PerfBenchScreen.tsx](https://github.com/rootnative/inertia/blob/main/example/screens/PerfBenchScreen.tsx), but FlashList needs a custom dev client. Run `FlatList` first — if Inertia is within 5% there, the swap is a confirmation rather than a discovery.
- JS-thread drops should be near zero on **both** variants. If they aren't, something is running JS per frame and the UI-thread comparison is being masked — diagnose that first.
- Since `0.0.7` the library ships **`Motion.FlatList`** (`@rootnative/inertia/flat-list`). The bar below is about a `Motion.Pressable` **row** inside a virtualized list, so it is unchanged by that — but if the bench screen is rebuilt on `Motion.FlatList`, record which scroller each number came from.

**Android only.** iOS does not drop frames at this list size, so a green iOS run proves nothing.

- [ ] Android: Inertia UI drops ▁▁▁ · hand-rolled ▁▁▁ · ratio ▁▁▁ (pass if ≤ 1.05)

## 2. `boxShadow` — multi-layer springs and `inset` on native (since `0.0.4`)

Screen: **boxShadow**. Two distinct questions, and the second is the one likely to bite.

:::info This item already found one defect
The first Android session on this screen found that `boxShadow` did not animate at all under `type: 'spring'` — the default — while working under `type: 'timing'`. The cause was the shape of the payload handed to Reanimated, and it is fixed; see the core changelog. The checks below are therefore **re-validation**, not first validation, and the spring boxes matter more than the rest of this page.
:::

**Multi-layer spring interpolation.** Tap **Raise all**. The first card animates a one-layer shadow to a two-layer one, so the padded transparent layer fades in rather than popping. Every length and colour of every layer springs independently.

- [ ] The shadow animates **at all** under a spring — the regression check.
- [ ] The extra layer **fades in** — no pop, no flash of an opaque shadow.
- [ ] No visible banding or stepping as blur radius springs.
- [ ] Under-damped overshoot (spring, `tension: 160`) doesn't make the two layers visibly desynchronise into a doubled edge.
- [ ] The animation **finishes** — an `onAnimationEnd` on the card fires. A non-settling spring is invisible until something waits on it (a chained step, an `exit` inside `<Presence>`).

**`inset` rendering.** This is the platform-risk item: `inset` box shadows have patchy native support, and the flag travels as a _static_ per-layer value rather than being interpolated.

- [ ] **iOS:** the inset card renders an _inner_ shadow, not an outer one.
- [ ] **Android:** same. If inset renders as an outer shadow or not at all, that is a **native limitation to document**, not a bug to fix in the resolver — record the OS version.
- [ ] Toggling deep ⇄ shallow inset animates the blur/offset without the shadow flipping inside↔outside mid-flight.

## 3. `layoutId` window-coordinate measurement (since `0.0.4`)

Screen: **Shared element transition (layoutId)**. This item has the most subtle failure mode of the five, because the fallback path is _silent and correct-looking_ in the easy case.

**Baseline — no offset parent.** Tap a grid card. The card should stay glued to the tile as it grows into the detail header.

- [ ] iOS: transition originates exactly at the tapped tile.
- [ ] Android: same.

**The real test — offset parent.** Tap **Offset the detail container**, then tap a card. This puts source and target under parents at different window offsets, which is exactly what parent-relative coordinates got wrong.

- [ ] iOS (Fabric): still glued to the tile. **If it lands short by the container's padding, window measurement isn't happening and the parent-relative fallback is in play** — that is the finding, and it means `measureInWindow` did not resolve synchronously on this platform/version.
- [ ] Android (Fabric): same.

**Scroll drift.** The consume-time re-measure exists because `onLayout` never fires for an _ancestor's_ scroll. Scroll the grid so a card is far from where it first laid out, then tap it.

- [ ] Transition originates at the card's **current** on-screen position, not its original one.

**What stays open regardless of how this run goes.** The example app has no navigator, so this exercises a conditional re-render, not a stack transition. The unresolved question — whether the source re-measure lands _before_ a navigator has begun translating the outgoing screen — needs either a navigator added to the example app or a validation consumer that uses one. If items above pass, downgrade this from "unvalidated" to "validated outside a navigator; navigator case still open" rather than closing it.

## 4. `layoutId` style carry (since `0.0.4`)

Same screen. Each card uses a deliberately darker detail shade so the crossfade is visible.

- [ ] Background colour **crossfades** over the transition rather than snapping at either end.
- [ ] The colour blend and the rect FLIP finish **together** — one lagging the other is the specific thing to watch for, since a spring-driven rect and a progress-driven colour can visibly diverge even though they share the same transition config.
- [ ] Corner radius interpolates smoothly where source and target differ.
- [ ] No frame where the arriving element wears _neither_ style (a flash of default/transparent).
- [ ] Enable OS reduce-motion, repeat: rect **and** style both snap together. Half a transition degrading is worse than none.

## 5. Layout keys — reflow cost (since `0.0.5`)

Screen: **Layout keys**. Built specifically for this comparison: each layout key sits beside its transform equivalent so the frame cost is directly visible.

Enable PerfMonitor, then toggle **Animate** repeatedly and watch the UI-thread counter per row.

- [ ] **`paddingHorizontal` vs `scaleX`** — both reach a similar end state. The padding card reflows; the scale card composites. Expect the padding card to be measurably worse on Android; **how much** worse is the number to record, since it's what justifies the docs' "prefer transforms" guidance.
- [ ] **`left` vs `translateX`** — the two bars must stay aligned _throughout_, not just at the endpoints. Divergence mid-flight means the inset path is fighting a parent's layout.
- [ ] **`fontSize` vs `scale`** — the `fontSize` label re-measures the text run each frame and pushes siblings; the scaled one overlaps. Confirm the reflowing one is the one that moves surrounding content.
- [ ] **Per-corner radii** — four independent shared values. Under the screen's deliberately tight spring (`friction: 20`) they should stay synchronised. Loosen to `friction: 8` in the screen source and confirm they _do_ desynchronise — that's the reason the default is tight, and worth seeing once.
- [ ] **`flex` split** — two panes trade space. This is the case with no transform equivalent, so a bad number here is a "document the cost" outcome, not a "use transforms instead" one.
- [ ] Android reflow cost is not so severe that a common case (a button growing padding on press) drops frames on a mid-range device.

## Recording results

Fill this in during the run, then copy the findings into the standing device-validation bullet in the design contract. **A number is worth more than a checkmark** — "Inertia 12 drops vs hand-rolled 11, ratio 1.09, fails" is actionable; "item 1 ✗" is not.

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

**If something fails**, prefer opening a defect with the recorded numbers over fixing it inside the validation session — a fix made without a second measurement is unverified in exactly the way this whole page exists to avoid. The one exception is item 2's `inset` rendering: a native platform limitation is a **documentation** outcome, not a defect.
