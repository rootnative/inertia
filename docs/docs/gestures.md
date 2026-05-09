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

When multiple sub-states are active at once, they layer **additively** in this order — later layers composite over earlier ones:

`hovered` → `focused` → `focusVisible` → `pressed`

Each declared sub-state owns its own progress (0↔1) shared value that fades in when the sub-state activates and back out when it releases. The `useAnimatedStyle` worklet composites the layers per-property:

```
v = base
v = lerp(v, hovered.value,      progressHovered)      // if declared
v = lerp(v, focused.value,      progressFocused)      // if declared
v = lerp(v, focusVisible.value, progressFocusVisible) // if declared
v = lerp(v, pressed.value,      progressPressed)      // if declared
```

(Color-valued keys use `interpolateColor` instead of `lerp`.) When a single sub-state is active, this collapses to "highest-priority declared layer wins" — a `pressed` target overrides everything below it. The win of layered composition is in **overlapping transitions**: release-while-still-hovered fades the press layer back to 0 independently while the hover layer holds at 1, so the value lands on the hover target rather than snapping back to base.

## Per-layer transitions

Each layer animates with its own transition. Resolution priority:

1. `transition.<stateName>` on the parent primitive (e.g. `transition.pressed`)
2. The top-level `transition` (when written as a top-level transition object)
3. Library default (spring)

```tsx
<Motion.Pressable
  gesture={{
    hovered: { backgroundColor: '#0001' },
    pressed: { backgroundColor: '#0003' },
  }}
  transition={{
    backgroundColor: { type: 'timing', duration: 120 },
    pressed: { type: 'timing', duration: 50 }, // press fade-in / out
    hovered: { type: 'timing', duration: 90 }, // hover fade-in / out
  }}
/>
```

Per-layer entries (`pressed`, `hovered`, …) and per-property entries (`backgroundColor`, `opacity`, …) live on the same `transition` map and don't conflict — none of the gesture-layer names are valid style props.

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

## When you need drag, pan, or swipe

The `gesture` prop covers Pressable-shaped states — anything that boils down to "active / inactive / focused / hovered". For continuous, value-bearing gestures (a thumb that follows the finger, a sheet that flicks closed, a carousel with momentum), reach for the [gestures adapter](./gestures-adapter): `useDrag`, `usePan`, `useSwipe`. It's an opt-in sibling package so the core library doesn't ship a `react-native-gesture-handler` peer for apps that only animate buttons.

A fully gesture-driven `Slider` is the canonical example the core package can't build alone — the thumb's position has to track touch X continuously, and that's what the adapter is for.
