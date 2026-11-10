---
sidebar_position: 11
description: The layout prop interpolates position and size changes that come from outside the animate flow, instead of letting them snap.
---

# Layout

The `layout` prop animates a change of position or size that comes from outside the `animate` flow: a flex sibling that grows, a list that reorders, a column that changes its width. Without the prop, those changes snap. With the prop, they interpolate.

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

Internally, the prop resolves to the `LinearTransition` builder of Reanimated. The prop takes the same react-spring vocabulary (`tension`, `friction`, `mass`) as `transition`. The raw Reanimated names (`stiffness`, `damping`) never appear in the public API.

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

A custom easing function must be a worklet, the same as `transition.easing`. Add the `'worklet'` directive as the first statement of the function. A plain function warns in dev and works on web only.

## What triggers a layout animation

`LinearTransition` fires when the measured frame of the native view changes between two commits. The common triggers:

- The siblings of the component reorder in a flex container.
- The size of the component changes because its `style` props swap (`height: 56` to `height: 96`).
- The position of the component moves because a sibling grew, shrank, or appeared.

The `animate` flow is independent. A `Motion.View` can have both `animate={{ opacity }}` and `layout`. The opacity runs through `useAnimatedStyle`, and the layout runs through the native commit hook of Reanimated. The two don't conflict.

## Reduced motion

`layout` follows [`<MotionConfig reducedMotion>`](./motion-config.md). When reduced motion is active, the prop resolves to no builder, and changes snap. Inertia passes `undefined` to the component, not a `.duration(0)` builder, because Reanimated still tracks commits for a builder. The snap path is cheaper.

## Shared element transitions (`layoutId`)

The `layoutId` prop is a separate but related mechanism. It moves one logical element between two screens or two layouts.

```tsx
// Screen A
<Motion.View layoutId="hero" style={styles.thumb} />

// Screen B (after navigation)
<Motion.View layoutId="hero" style={styles.heroLarge} />
```

The first `Motion.View` unmounts. A second `Motion.View` with the same `layoutId` mounts within about 1 second. The new element then runs a FLIP animation into place, from the rect that the first element measured as it unmounted. That is a hero transition with no animation config beyond the shared id.

How `layoutId` differs from `layout`:

- `layout` animates the changes of size and position of **this** element between commits. It needs no id.
- `layoutId` animates from the last rect of **another** element to the current rect of this element, across a mount or a screen.

The `transition` prop of the **incoming** element controls the FLIP animation. The default is a spring. `'timing'` works. `'decay'` downgrades to a spring. Reduced motion skips the transition. The outgoing element gives only its last rect and its style snapshot. The `transition` must be a top-level transition object (`transition={{ type: 'timing', duration: 250 }}`). The entries of a per-property map don't reach the FLIP. If the map also carries config keys, such as `{ type: 'timing', duration: 250, opacity: { … } }`, the FLIP uses those keys. Otherwise the default spring applies. The FLIP reads `duration`, `easing`, and `delay` of a timing transition, and `tension`, `friction`, `mass`, `velocity`, and `delay` of a spring. A `delay` holds the element at the source rect before it moves. `repeat` doesn't apply.

### Style carry

The rect FLIP moves and scales the element. A hero card that also changes its colour or its corner radius between screens would snap on those props while its frame animates. That is the most visible half of the transition. So Inertia carries a set of style keys from the source and crossfades them out over the same transition:

| Carried                                                                           | Not carried                                                                                                                                                                                                                                    |
| --------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `opacity`, `borderRadius`, `backgroundColor`, `borderColor`, `color`, `tintColor` | Transform keys (the FLIP owns them — carrying them too would double-apply the displacement), `shadowColor` (crossfading one of four native shadow props over snapped geometry looks worse than letting the shadow snap whole), everything else |

```tsx
// Screen A — a small tile
<Motion.View layoutId="hero" style={{ borderRadius: 14, backgroundColor: '#f97316' }} />

// Screen B — a large header. Radius and colour crossfade with the rect.
<Motion.View layoutId="hero" style={{ borderRadius: 24, backgroundColor: '#ea580c' }} />
```

There is nothing to configure. The carry uses the existing `layoutId` and `transition` props. There is no key list to override and no `layoutStyles` prop. If you need a key that Inertia doesn't carry, drive it from `animate` on both sides.

Rules to know:

- **A key takes part only when the element already has a value for it**, from `animate`, `initial`, a variant, `gesture`, or its static `style`. Inertia never invents a value. A key that the element says nothing about would rest at the generic type default. For `color` on a `Motion.Text` that inherits its colour from a parent, that default is `'transparent'`: invisible text on an element that you only asked to move.
- **Inertia ignores a key that one side lacks, in both directions.** A key that the source carried but the target has no value for does nothing, and the reverse is also true.
- **Inertia reads a source that is still mounted live**, for the same reason that it measures its rect again: its values move without a layout pass. After the source unmounts, only the snapshot from the unmount remains.
- **The carry overrides `initial` for the carried keys** on the mount that consumes a source. The carry composites above the base value, so the first frame shows the colour of the source, whatever `initial` asked for.
- **Reduced motion and `'no-animation'` snap**, the same as the rect path. A coordinate-space mismatch also snaps: half a shared-element transition looks like a glitch, not like a fallback.

### Caveats and current scope

- **Window coordinates, where the host can supply them.** Inertia measures a rect with `measureInWindow`, which resolves synchronously on the New Architecture (Fabric). On web, react-native-web answers `measureInWindow` from a `setTimeout`, so Inertia reads the `getBoundingClientRect()` of the DOM node instead. That is the same window rect, read synchronously. So a source and a target can sit under containers at different screen offsets and still line up. Where a synchronous measurement isn't available, both fall back to the parent-relative coordinates that `onLayout` reports. That is the case on the legacy architecture, where `measureInWindow` answers over the bridge, and for a node that already detached. The fallback is consistent, but it doesn't see the offsets of the parents. So a setup with nested parents lines up only on Fabric and on web.
- **Mixed coordinate spaces skip the transition.** A source in one space and a target in the other aren't comparable: the delta would be off by the window offset of the parent. Inertia skips the animation and lets the element appear at its natural position. It doesn't move the element in from the wrong place.
- **Inertia measures a source that is still mounted again on demand.** `onLayout` doesn't fire when an _ancestor_ scrolls, so a stored window rect drifts while the element hasn't moved relative to its parent. When the FLIP starts, Inertia asks a source that is still mounted for a current measurement, instead of the stored one. That is the usual case: a stack navigator keeps the previous screen alive below. So a scroll of a list before a tap on a row doesn't offset the transition. The FLIP starts as the target mounts, or on its first layout where Inertia can't measure the target yet. After the source unmounts, only the rect from the unmount remains. If the navigator already moves the outgoing screen, the new measurement catches the screen mid-transition, as far as the transition has moved.
- **A source measures itself as it unmounts.** A transform moves an element without a layout pass, so `onLayout` doesn't report it. A source that entered with `initial={{ scale: 0.4 }}` lays out once, mid-entrance, and that rect is too small. Inertia measures the rect that the next mount consumes in the unmount cleanup, while the node is still attached, so the rect has the final transform in it. The last layout rect is the fallback when Inertia can't measure the node.
- **A native stack push can hide the FLIP on iOS.** The native stack slides the new screen in, and the target mounts while that slide still moves the screen. On an iOS simulator with the native stack of Expo Router, the target appeared at its final size on the first frame of the new screen, with no FLIP. Android is not measured. To show the FLIP, present the target screen with no native animation, so that the FLIP is the transition:

  ```tsx
  <Stack.Screen
    name="detail"
    options={{ presentation: 'transparentModal', animation: 'none' }}
  />
  ```

- **One mount per id.** Two `Motion.*` primitives with the same `layoutId` mounted at the same time is undefined behavior. The most recent layout commit wins as the source for the next consumer.
- **TTL.** A source that is still mounted stays valid as long as it is mounted. A list card that laid out once and then sat still for a minute is as good a source as one that laid out a frame ago, because Inertia can measure it again. A rect that a source recorded on unmount is valid for about 1 second. A new mount in the same render as the unmount, such as a grid card that a detail header replaces, takes the rect when it mounts, before its first layout. So a slow device doesn't cancel the FLIP. If the new mount lands later (a slow navigation, a paused transition), no FLIP runs. The element then appears at its natural position.
- **In tests.** The `measureInWindow` of the Jest host mock never calls its callback, so a test suite always sees the parent-relative path. That is intentional: it keeps the `layoutId` behavior in tests stable and independent of measurement.

### Why not `sharedTransitionTag`?

Reanimated 4 removed `sharedTransitionTag` and `SharedTransition`. `layoutId` is the Inertia replacement. It's a JS-side measure registry, not a native handoff, so it needs no native screen-transition harness. It works with any navigator (React Navigation, Expo Router, or your own) that mounts and unmounts screens.

## What `layout` doesn't do (yet)

- **Per-axis control (`layout="position"` or `layout="size"`).** `LinearTransition` has no axis filter: the whole frame animates together. If you need to control one dimension, animate it through `animate` instead.
- **Layout callbacks.** `onAnimationEnd` fires for `animate` keys, not for layout commits. The `withCallback` of Reanimated backs that on the layout side. Inertia doesn't expose it yet.

## Caveats

- The wrapped component must render a native host view. Every `Motion.*` primitive does. If you wrap a custom component with `createMotionComponent(C)`, make sure that `C` renders a host view. Otherwise the prop does nothing.
- A layout animation on a virtualized list item (a FlatList row) can conflict with the measurement passes of the list. Measure the result before you add `layout` to a row component. Use the [Perf bench](./perf-bench.md) screen to test it.
