---
sidebar_position: 11
---

# Layout

The `layout` prop animates position and size changes that come from outside the `animate` flow — a flex sibling growing, a list reordering, a column toggling its width. Without it, those changes snap; with it, they interpolate.

```tsx
import { Motion } from '@rootnative/inertia'

function ReorderableRow({ item, onPress }: Props) {
  return (
    <Motion.View
      layout={{ type: 'spring', tension: 200, friction: 22 }}
      style={styles.row}
    />
  )
}
```

Internally the prop resolves to Reanimated's `LinearTransition` builder; the same react-spring vocabulary (`tension`, `friction`, `mass`) you use for `transition` works here too. Raw Reanimated names (`stiffness` / `damping`) never appear on the public API.

## Accepted shapes

| Value              | Meaning                                                                                         |
| ------------------ | ----------------------------------------------------------------------------------------------- |
| omitted / `false`  | No layout animation. Position and size changes snap (default).                                  |
| `true`             | Library default spring (`tension: 170`, `friction: 26`, `mass: 1`).                             |
| `TransitionConfig` | `'spring'` or `'timing'`. `'decay'` downgrades to spring; `'no-animation'` skips the animation. |

```tsx
<Motion.View layout />                                          // default spring
<Motion.View layout={{ type: 'spring', tension: 240 }} />        // custom spring
<Motion.View layout={{ type: 'timing', duration: 320 }} />       // duration-based
<Motion.View layout={{ type: 'timing', easing: (t) => t * t }} /> // custom easing
```

Custom easing functions must be worklets, same as `transition.easing` — add the `'worklet'` directive as the function's first statement. Plain functions warn in dev and only work on web.

## What triggers a layout animation

`LinearTransition` fires whenever the underlying native view's measured frame changes between commits. The common triggers:

- The component's siblings reorder in a flex container.
- The component's size changes because its `style` props swap (`height: 56` ↔ `height: 96`).
- The component's position shifts because a sibling grew, shrank, or was inserted.

The `animate` flow is independent. A `Motion.View` can have both `animate={{ opacity }}` and `layout` — the opacity drives through `useAnimatedStyle`, the layout drives through Reanimated's native commit hook. They don't fight.

## Reduced motion

`layout` participates in [`<MotionConfig reducedMotion>`](./motion-config.md) — when reduced motion is active, the prop resolves to no builder and changes snap. We pass `undefined` to the underlying component rather than a `.duration(0)` builder because Reanimated still runs commit-tracking machinery in the latter case; the snap path is genuinely cheaper.

## Shared element transitions (`layoutId`)

The `layoutId` prop is a separate but related mechanism for transitioning a logical element between two screens or two layouts.

```tsx
// Screen A
<Motion.View layoutId="hero" style={styles.thumb} />

// Screen B (after navigation)
<Motion.View layoutId="hero" style={styles.heroLarge} />
```

When the first `Motion.View` unmounts and a second `Motion.View` with the same `layoutId` mounts within ~1 second, the new element FLIPs into place from the previous element's last measured rect — a Hero-style transition without any explicit animation config beyond the shared id.

How it differs from `layout`:

- `layout` animates **this** element's own size/position changes between commits (no id needed).
- `layoutId` animates from **another** element's last rect to this element's current rect (cross-mount or cross-screen).

The **incoming** element's `transition` prop controls the FLIP animation (spring by default; `'timing'` honored; `'decay'` downgrades to spring; reduced motion skips the transition) — the outgoing element contributes only its last rect and style snapshot. Note it must be a top-level transition object (`transition={{ type: 'timing', duration: 250 }}`); a per-property map is ignored for the FLIP and the default spring applies.

### Style carry

The rect FLIP moves and scales the element. A hero card that also changes colour or corner radius between screens would otherwise snap on those props while its frame animated — the most visible half of the transition arriving instantly. So a set of style keys is carried across from the source and crossfaded out over the same transition:

| Carried                                                                           | Not carried                                                                                                                                                                                                                                    |
| --------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `opacity`, `borderRadius`, `backgroundColor`, `borderColor`, `color`, `tintColor` | Transform keys (the FLIP owns them — carrying them too would double-apply the displacement), `shadowColor` (crossfading one of four native shadow props over snapped geometry looks worse than letting the shadow snap whole), everything else |

```tsx
// Screen A — a small tile
<Motion.View layoutId="hero" style={{ borderRadius: 14, backgroundColor: '#f97316' }} />

// Screen B — a large header. Radius and colour crossfade with the rect.
<Motion.View layoutId="hero" style={{ borderRadius: 24, backgroundColor: '#ea580c' }} />
```

Nothing to configure — it rides the existing `layoutId` and `transition` props. There is no key list to override and no `layoutStyles` prop; if you need a key that isn't carried, drive it from `animate` on both sides.

Rules worth knowing:

- **A key only participates when the element already has a value for it** — from `animate` / `initial` / a variant / `gesture`, or from its static `style`. Values are never invented: activating a key the element says nothing about would rest it at the generic type default, and for `color` on a `Motion.Text` that inherits its colour from a parent, that default is `'transparent'` — invisible text on an element you only asked to move.
- **Mismatched keys are ignored, both directions.** A key the source carried but the target has no value for does nothing, and vice versa.
- **A still-mounted source is read live**, for the same reason its rect is re-measured — its values move without a layout pass. Once it has unmounted, the snapshot taken at release is all that remains.
- **The carry overrides `initial` for carried keys** on the mount that consumes a source. It composites above the base value, so the first frame shows the source's colour whatever `initial` asked for.
- **Reduced motion and `'no-animation'` snap**, matching the rect path. So does a coordinate-space mismatch — half a shared-element transition reads as a glitch, not as graceful degradation.

### Caveats and current scope

- **Window coordinates, where the host can supply them.** Rects are measured with `measureInWindow`, which resolves synchronously on the New Architecture (Fabric). That is what lets a source and target sit under containers at different screen offsets and still line up. Where a synchronous measurement isn't available — the legacy architecture, whose `measureInWindow` answers over the bridge, or a node that has already detached — both fall back to the parent-relative coordinates `onLayout` reports. That fallback is consistent but blind to the parents' own offsets, so nested-parent setups only line up on Fabric.
- **Mixed coordinate spaces skip the transition.** A source recorded in one space and a target measured in the other are not comparable — the delta would be off by the parent's window offset. Inertia skips the animation and lets the element appear at its natural position rather than flinging it in from the wrong place.
- **A still-mounted source is re-measured on demand.** `onLayout` does not fire when an _ancestor_ scrolls, so a stored window rect drifts while the element hasn't moved relative to its parent. When the target lays out, Inertia asks a still-mounted source (the usual case — a stack navigator keeps the previous screen alive underneath) for a current measurement instead of trusting the stored one. Scrolling a list before tapping a row therefore doesn't offset the transition. Once the source has unmounted, its last recorded rect is all that remains — and if the navigator has already begun translating the outgoing screen, the re-measurement catches it mid-transition, bounded by however far the transition has progressed.
- **One mount per id.** Two `Motion.*` primitives with the same `layoutId` mounted simultaneously is undefined behavior. The most-recent layout commit wins as the source for the next consumer.
- **TTL.** Released rects are consumable for ~1 second. If the new mount lands later (a slow navigation, a paused transition), no FLIP runs and the element just appears at its natural position — graceful degradation.
- **In tests.** The Jest host mock's `measureInWindow` never invokes its callback, so a test suite always sees the parent-relative path. That's intentional: it keeps `layoutId` behavior in tests stable and independent of measurement.

### Why not `sharedTransitionTag`?

Reanimated 4 removed `sharedTransitionTag` / `SharedTransition` entirely; `layoutId` is the Inertia-side replacement. It's a JS-side measure registry rather than a native handoff, so it doesn't require a native screen-transition harness — it works with any navigator (React Navigation, Expo Router, hand-rolled) that mounts and unmounts screens.

## What `layout` doesn't do (yet)

- **Per-axis control (`layout="position"` / `layout="size"`)** — `LinearTransition` doesn't expose an axis filter; the whole frame animates together. If you need to gate a specific dimension, animate it through `animate` instead.
- **Layout-tied callbacks** — `onAnimationEnd` fires for `animate` keys, not for layout commits. Reanimated's `withCallback` is what backs that on the layout side; we haven't surfaced it yet.

## Caveats

- The wrapped component must render a native host view. Every `Motion.*` primitive does; if you wrap a custom component via `createMotionComponent(C)`, ensure `C` ultimately renders a host view, or the prop is a no-op.
- Layout animations on virtualized list items (FlatList rows) can fight the list's own measurement passes — measure twice before adding `layout` to row components. The [Perf bench](./perf-bench.md) screen is the place to test.
