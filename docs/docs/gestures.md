---
sidebar_position: 7
---

# Gestures

A single `gesture` prop on every Motion primitive — no `whileTap` / `whilePress` soup, no separate "pressable" variant. When the prop is omitted no handlers are mounted (zero overhead).

```tsx
<Motion.View
  gesture={{
    pressed: { scale: 0.96 },
    hovered: { opacity: 0.9 },
    focused: { opacity: 0.85 },
    focusVisible: { borderColor: '#4f46e5' },
  }}
  transition={{ type: 'spring' }}
/>
```

## Sub-states

| Sub-state      | Active when                                                                                                                                                                      | Backed by                                                                                                      |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `pressed`      | A finger / pointer is on the component (touch start → end / cancel).                                                                                                             | `onTouchStart` / `End` / `Cancel`, plus `onPressIn` / `onPressOut` for `Motion.Pressable`.                     |
| `focused`      | The component owns focus, regardless of how it arrived (mouse, touch, or keyboard).                                                                                              | `onFocus` / `onBlur`.                                                                                          |
| `focusVisible` | Focus arrived from the keyboard (W3C `:focus-visible`). On native — where focus always arrives via D-pad / hardware keyboard / screen reader — behaves identically to `focused`. | `onFocus` + module-level input-modality tracker (web `keydown` vs `pointerdown` / `mousedown` / `touchstart`). |
| `hovered`      | Pointer is over the component. **Web-only**, no-op on native.                                                                                                                    | `onMouseEnter` / `onMouseLeave`.                                                                               |

Sub-states layer over the base `animate` target per-property. When a sub-state is released, the property animates back to whatever was set in `animate` (or to the property's default resting value if `animate` doesn't touch it).

Use `focused` for state-layer fills (any focus, including click-focus on web) and `focusVisible` for focus rings (keyboard-only). Declaring both gives you the right behaviour automatically: clicking a button shows the state layer; tabbing to it shows the state layer **and** the ring.

## Priority

When multiple sub-states are active at once, they layer in this order — later wins:

`hovered` < `focused` < `focusVisible` < `pressed`

So a `pressed` value always wins over `focusVisible`, which wins over `focused`, which wins over `hovered`. `focusVisible` sits above `focused` so a keyboard-focused component picks up both layers; pointer-focused components only get `focused`.

Sub-states stack as **single-state selection**, not blended interpolation: the highest-priority active key's value wins per-property, with one transition between target values. If you need true layered cross-fades — e.g. press blending over hover blending over focus during overlapping transitions — drop down to the hooks layer (`useMotionValue` / `useSpring`) and chain `interpolateColor` calls yourself.

## Type inference

`gesture` sub-states are typed against the same `style`-derived shape as `animate`. So `tintColor` autocompletes inside `gesture.pressed` on `Motion.Image` and is rejected on `Motion.View`.

## Composing user handlers

Inertia composes its internal handlers with whatever you've already attached:

```tsx
<Motion.Pressable
  onPressIn={(event) => analytics.track('press', event)}
  gesture={{ pressed: { scale: 0.96 } }}
/>
```

Your `onPressIn` runs first, then the internal pressed-state setter. The same composition applies to every event the gesture prop subscribes to.
