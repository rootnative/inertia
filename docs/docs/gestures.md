---
sidebar_position: 7
---

# Gestures

A single `gesture` prop on every Motion primitive — no `whileTap` / `whilePress` soup, no separate "pressable" variant. When the prop is omitted no handlers are mounted (zero overhead).

```tsx
<Motion.View
  gesture={{
    pressed: { scale: 0.96 },
    focused: { borderColor: '#4f46e5' },
    hovered: { opacity: 0.9 },
  }}
  transition={{ type: 'spring' }}
/>
```

## Sub-states

| Sub-state | Active when                                                          | Backed by                                                                                  |
| --------- | -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `pressed` | A finger / pointer is on the component (touch start → end / cancel). | `onTouchStart` / `End` / `Cancel`, plus `onPressIn` / `onPressOut` for `Motion.Pressable`. |
| `focused` | The component owns keyboard / TV focus.                              | `onFocus` / `onBlur`.                                                                      |
| `hovered` | Pointer is over the component. **Web-only**, no-op on native.        | `onMouseEnter` / `onMouseLeave`.                                                           |

Sub-states layer over the base `animate` target per-property. When a sub-state is released, the property animates back to whatever was set in `animate` (or to the property's default resting value if `animate` doesn't touch it).

## Priority

When multiple sub-states are active at once, they layer in this order — later wins:

`hovered` < `focused` < `pressed`

So a `pressed` value always wins over a `hovered` one, even if the user is hovering and pressing simultaneously.

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
