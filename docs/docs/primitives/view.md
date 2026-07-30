---
sidebar_position: 2
---

# Motion.View

Animatable `View`. The default primitive — use it for boxes, surfaces, and anything that doesn't need to be `Text` / `Image` / scrolling / pressable.

```tsx
import { Motion } from '@rootnative/inertia'

export function Card() {
  return (
    <Motion.View
      initial={{ opacity: 0, translateY: 24 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: 'spring', tension: 200, friction: 18 }}
      style={cardStyles.card}
    />
  )
}
```

## Tree-shaken import

```ts
import { MotionView } from '@rootnative/inertia/view'
```

## Animatable keys

`opacity`, `translateX`, `translateY`, `scale`, `scaleX`, `scaleY`, `rotate`, `rotateX`, `rotateY`, `width`, `height`, `borderRadius`, `shadowOpacity`, `shadowRadius`, `elevation`, `backgroundColor`, `borderColor`, `shadowColor`, `shadowOffset`, `boxShadow`.

Since `0.0.5`, also the layout numerics: per-corner radii (`borderTopLeftRadius` and siblings), border widths (`borderWidth`, `borderTopWidth`, …), absolute insets (`top` / `right` / `bottom` / `left`), padding and margin (including the `*Horizontal` / `*Vertical` shorthands), `flex` / `flexGrow` / `flexShrink`, `gap` / `rowGap` / `columnGap`, and `zIndex`. See [Animatable properties](.#animatable-properties) for the full table, the layout-cost caveat, and the list of keys that are deliberately excluded.

Anything outside that set is a **compile error** on `animate`, not a silent no-op — `animate={{ alignItems: 'center' }}` fails to typecheck rather than rendering nothing.

## Animating layout vs. transforms

`width` / `height` / `padding` / `flex` / the inset keys all drive real layout, so each frame reflows the subtree. That is the correct tool when the layout genuinely changes, but it is measurably more expensive than the compositor-only transform path:

```tsx
// Prefer this for pure motion — no reflow.
<Motion.View animate={{ translateX: 100, scale: 1.1 }} />

// Use this when the box itself must change (siblings should reflow around it).
<Motion.View animate={{ paddingHorizontal: 32, borderBottomWidth: 4 }} />
```

Animating `width` / `height` on a container that isn't `flex: 1` can jitter on Fabric; the same caveat applies to the layout keys above. For a size change that only needs to _look_ right, `scaleX` / `scaleY` is smoother.

## Shadow animation

Shadow keys ride the same animatable pipeline as other numeric / color props — `shadowOpacity`, `shadowRadius`, `elevation` are numerics; `shadowColor` is a color. `shadowOffset` is the one nested-object style on the surface; internally the worklet decomposes it into two synthetic axis SVs and recomposes them into a single `{ width, height }` prop each frame.

```tsx
// MD3 elevation cascade — flat numerics + the nested shadowOffset
<Motion.View
  initial={{
    shadowOpacity: 0,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 0 },
    elevation: 0,
  }}
  animate={{
    shadowOpacity: 0.15,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  }}
  gesture={{
    hovered: {
      shadowOpacity: 0.2,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 2 },
      elevation: 2,
    },
  }}
/>
```

`shadowOffset` supports the **single-value form only** — `{ width: number, height: number }`. Sequences inside the nested object (`{ width: [0, 100, 0], height: 0 }`) and array keyframes on the whole object are out of scope; drop to the value-layer hooks (`useMotionValue` + `useAnimatedStyle`) when you need them. Per-axis transition splits are also out of scope — the top-level `transition.shadowOffset` applies to both axes.

## `boxShadow`

`boxShadow` animates the cross-platform CSS shadow form. It accepts a CSS string (what a design system stores its elevation tokens as) or React Native's own array-of-layers:

```tsx
<Motion.View
  initial={{ boxShadow: '0px 1px 2px rgba(0, 0, 0, 0.25)' }}
  animate={{
    boxShadow:
      '0px 6px 14px rgba(0, 0, 0, 0.28), 0px 2px 4px 1px rgba(0, 0, 0, 0.15)',
  }}
  transition={{ boxShadow: { type: 'spring', tension: 160, friction: 18 } }}
/>
```

```tsx
// Equivalent structured form — lengths may be numbers or px strings.
<Motion.View
  animate={{
    boxShadow: [{ offsetX: 0, offsetY: 8, blurRadius: 16, color: '#4f46e57a' }],
  }}
/>
```

**Layer counts may differ between endpoints.** The shorter side is padded with a transparent zero layer, the same way CSS transitions pad, so a one-layer shadow animating to a two-layer one fades the extra layer in rather than popping it. Every length and color interpolates per layer.

**`inset` is not interpolated.** It travels as a static per-layer flag, because there is no meaningful midpoint between an inner and an outer shadow. Both endpoints may use `inset` freely, but a layer that is `inset` on one side and not the other throws — pad with a transparent layer if you need the counts to line up differently.

**Two constraints to know:**

- **No sequences on this key.** `boxShadow: [a, b]` means one two-layer shadow, not a two-step keyframe sequence — the array slot belongs to layers, and nothing distinguishes the two shapes structurally. Same single-value contract `shadowOffset` carries. Per-property transitions are unaffected.
- **Not available in `gesture` sub-states.** Compositing a layer stack in the priority cascade would mean per-layer interpolation on the UI thread for every primitive. Drive it from `animate` instead — optionally through a variant keyed off the same state — or interpolate it yourself with [`useShadow`](../api/hooks#useshadow-from-to-progress-). Inertia warns in dev if it finds `boxShadow` inside a `gesture` sub-state.

Only px (and unitless) lengths are supported; `em` / `%` / `rem` depend on font or viewport context a style value can't resolve, and are rejected rather than silently animating from a `NaN`.

Don't animate `boxShadow` and the native `shadow*` keys on the same element — that applies two shadow systems at once and whichever the view resolves last wins. Inertia warns in dev when both appear in one instance's animated key set.

## Notes

- `transform` is composed automatically. Mixing transform keys (e.g. `translateX` + `scale`) into one `animate` object emits a single `transform` array — you don't write `transform: [...]` yourself.
- `rotate`, `rotateX`, and `rotateY` are numbers, in degrees. The factory wraps each as `{ rotate: '${value}deg' }` (etc.) for Reanimated. Use `rotateX` / `rotateY` together with a `perspective` style entry to get the 3D effect to render.
- `width` / `height` interpolation can jitter on Fabric for non-`flex: 1` containers. Prefer `scaleX` / `scaleY` for resize animations where layout impact is acceptable.
- Shadow rendering is platform-specific: iOS uses `shadowColor` / `shadowOpacity` / `shadowOffset` / `shadowRadius`; Android uses `elevation` (which derives its own shadow). Animate both sets together when you need a cross-platform cascade.
