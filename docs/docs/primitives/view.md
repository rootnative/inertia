---
sidebar_position: 2
description: Animatable View — the default primitive for boxes, surfaces, and anything that is not text, an image, scrolling, or pressable.
---

# Motion.View

Animatable `View`. It's the default primitive. Use it for boxes, surfaces, and anything that isn't text, an image, a scroll container, or a pressable.

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

Since `0.0.5`, also the layout numerics: the per-corner radii (`borderTopLeftRadius` and its siblings), the border widths (`borderWidth`, `borderTopWidth`, …), the absolute insets (`top`, `right`, `bottom`, `left`), padding and margin (including the `*Horizontal` and `*Vertical` shorthands), `flex`, `flexGrow`, `flexShrink`, `gap`, `rowGap`, `columnGap`, and `zIndex`. See [Animatable properties](.#animatable-properties) for the full table, the layout-cost caveat, and the list of excluded keys.

Any key outside that set is a **compile error** on `animate`, not a silent no-op. `animate={{ alignItems: 'center' }}` fails the type check instead of rendering nothing.

## Animating layout vs. transforms

`width`, `height`, `padding`, `flex`, and the inset keys all drive real layout, so each frame reflows the subtree. That is the correct tool when the layout changes, but it costs measurably more than the compositor-only transform path:

```tsx
// Prefer this for pure motion — no reflow.
<Motion.View animate={{ translateX: 100, scale: 1.1 }} />

// Use this when the box itself must change (siblings should reflow around it).
<Motion.View animate={{ paddingHorizontal: 32, borderBottomWidth: 4 }} />
```

A `width` or `height` animation on a container that isn't `flex: 1` can jitter on Fabric. The same caveat applies to the layout keys above. For a size change that only has to _look_ right, `scaleX` and `scaleY` are smoother.

## Shadow animation

The shadow keys use the same animatable pipeline as the other numeric and color props. `shadowOpacity`, `shadowRadius`, and `elevation` are numbers. `shadowColor` is a color. `shadowOffset` is the one nested-object style on the surface. Internally, the worklet splits it into two synthetic axis shared values and joins them into one `{ width, height }` prop on each frame.

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

`shadowOffset` supports the **single-value form only**: `{ width: number, height: number }`. A sequence inside the nested object (`{ width: [0, 100, 0], height: 0 }`) and an array of keyframes on the whole object are out of scope. Use the value-layer hooks (`useMotionValue` and `useAnimatedStyle`) when you need them. A transition per axis is also out of scope. The top-level `transition.shadowOffset` applies to both axes.

## `boxShadow`

`boxShadow` animates the cross-platform CSS shadow form. It accepts a CSS string, the form in which a design system stores its elevation tokens, or the array of layers of React Native:

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

**The two ends can have a different number of layers.** Inertia pads the shorter side with a transparent zero layer, the same as a CSS transition. So a one-layer shadow that animates to a two-layer shadow fades the extra layer in and doesn't pop it. Every length and color interpolates per layer.

**`inset` doesn't interpolate.** It travels as a static flag per layer, because there is no meaningful midpoint between an inner and an outer shadow. Both ends can use `inset`. A layer that is `inset` on one side and not on the other throws. Pad with a transparent layer if the counts must line up differently.

**Two constraints to know:**

- **No sequence on this key.** `boxShadow: [a, b]` means one two-layer shadow, not a two-step keyframe sequence. The array slot belongs to the layers, and nothing tells the two shapes apart structurally. This is the same single-value contract as `shadowOffset`. Per-property transitions still work.
- **Not available in a `gesture` sub-state.** A layer stack in the priority cascade would mean interpolation per layer on the UI thread for every primitive. Drive it from `animate` instead, optionally through a variant keyed on the same state, or interpolate it yourself with [`useShadow`](../api/hooks#useshadow-from-to-progress-). Inertia warns in dev when it finds `boxShadow` inside a `gesture` sub-state.

Only px and unitless lengths are supported. `em`, `%`, and `rem` depend on a font or viewport context that a style value can't resolve. Inertia rejects them instead of an animation from `NaN`.

Don't animate `boxShadow` and the native `shadow*` keys on the same element. That applies two shadow systems at once, and the one that the view resolves last wins. Inertia warns in dev when both appear in the animated key set of one instance.

## Notes

- Inertia composes `transform` for you. Transform keys in one `animate` object (for example `translateX` and `scale`) emit one `transform` array. You don't write `transform: [...]` yourself.
- `rotate`, `rotateX`, and `rotateY` are numbers, in degrees. The factory wraps each one as `{ rotate: '${value}deg' }` (and so on) for Reanimated. Use `rotateX` or `rotateY` together with a `perspective` style entry, so the 3D effect renders.
- A `width` or `height` interpolation can jitter on Fabric on a container that isn't `flex: 1`. Prefer `scaleX` and `scaleY` for a resize animation where the layout impact is acceptable.
- Shadow rendering is platform-specific. iOS uses `shadowColor`, `shadowOpacity`, `shadowOffset`, and `shadowRadius`. Android uses `elevation`, which derives its own shadow. Animate both sets together when you need a cross-platform cascade.
