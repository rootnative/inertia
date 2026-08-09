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
| `pressed`      | Any pointer is down on the component — finger, mouse, or pen — until it lifts or the gesture is cancelled.                                                                       | `onTouchStart` / `End` / `Cancel`, `onPointerDown` / `Up` / `Cancel` (web), plus `onPressIn` / `onPressOut`.   |
| `focused`      | The component owns focus, regardless of how it arrived (mouse, touch, or keyboard).                                                                                              | `onFocus` / `onBlur`.                                                                                          |
| `focusVisible` | Focus arrived from the keyboard (W3C `:focus-visible`). On native — where focus always arrives via D-pad / hardware keyboard / screen reader — behaves identically to `focused`. | `onFocus` + module-level input-modality tracker (web `keydown` vs `pointerdown` / `mousedown` / `touchstart`). |
| `hovered`      | Pointer is over the component. **Web-only**, no-op on native.                                                                                                                    | `onMouseEnter` / `onMouseLeave`.                                                                               |

Sub-states layer over the base `animate` target per-property. When a sub-state is released, the property animates back to whatever was set in `animate`. If `animate` doesn't touch that property, it rests at **whatever your static `style` sets** — so the focus ring above returns to the `borderColor` on the element's own stylesheet, and you don't have to restate resting values in `animate` just because a sub-state mentions them:

```tsx
const styles = StyleSheet.create({
  field: { borderColor: '#d4d4d8', borderWidth: 1 },
})

// Rests at #d4d4d8, animates to #4f46e5 on focus, returns to #d4d4d8.
<Motion.View style={styles.field} gesture={{ focused: { borderColor: '#4f46e5' } }} />
```

Only when neither `animate` nor `style` provides a value does the property fall back to its type default (`0` for numbers, `transparent` for colors). The same rule covers `exit` targets and properties that appear in only some `variants` branches — a key mentioned by any of them joins the animated set, but it rests on your style until something actually drives it.

Use `focused` for state-layer fills (any focus, including click-focus on web) and `focusVisible` for focus rings (keyboard-only). Declaring both gives you the right behaviour automatically: clicking a button shows the state layer; tabbing to it shows the state layer **and** the ring.

### Author `pressed` against rest, not against `hovered`

Because `hovered` never activates on a touch device, a `pressed` target that only makes sense as a step down from `hovered` produces **no motion at all** on native:

```tsx
// Wrong on native: pressed is value-identical to rest, so nothing animates.
<Motion.View
  style={styles.card} // shadowOpacity: 0.15
  gesture={{
    hovered: { shadowOpacity: 0.22 }, // lift on hover (web)
    pressed: { shadowOpacity: 0.15 }, // settle back down — same as rest
  }}
/>
```

On web this reads correctly: hover lifts the card, press settles it. On iOS and Android there is no hover layer, so the cascade runs rest → `pressed` — and the two values are the same. The animation is a no-op, and nothing warns you, because a target equal to the resting value is perfectly legal.

Write each sub-state as an absolute target measured from **rest**, and treat `hovered` as an intermediate step that only some platforms see:

```tsx
// Right: every layer differs from rest, so each one moves on every platform.
<Motion.View
  style={styles.card} // shadowOpacity: 0.15
  gesture={{
    hovered: { shadowOpacity: 0.19 }, // web-only intermediate
    pressed: { shadowOpacity: 0.34 }, // the raise — visible on touch
  }}
/>
```

The general rule: **verify each sub-state against rest on its own**, since that is the only comparison a touch device ever makes.

## Priority

When multiple sub-states are active at once, they composite as a **priority cascade** in this order — later layers composite over earlier ones:

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

## When the prop isn't enough — `useGesture`

The `gesture` prop animates the receiver's own style. If you need one Pressable's gesture state to drive **multiple** animated views (a focus ring rendered as a sibling, an MD3 state-layer halo over the content, a separate icon-color animation), reach for [`useGesture`](./api/hooks#usegesturetransition) — the hook-form of this prop. It returns the underlying 0↔1 progress shared values for `pressed` / `focused` / `focusVisible` / `hovered` plus a handler bag to spread on a `Pressable`. Feed the shared values into as many `useAnimatedStyle` blocks as you need.

```tsx
const { pressed, focused, hovered, handlers } = useGesture()
// ...drive a focus ring, a halo, a tint — each from the same gesture state
<Pressable {...handlers}>{children}</Pressable>
```

The prop and the hook share the layered-blend model, the `isFocusVisible()` semantics, and the `<MotionConfig reducedMotion>` gating — they're the same machinery, two surfaces.

## When you want MD3 state-layer overlays — `useGestureLayer`

The `gesture` prop composites states as a fixed **priority cascade** — when hovered and pressed are both fully active, the value converges to the `pressed` target because it sits highest in the cascade, regardless of which target is numerically stronger. MD3 state-layer haloes and iOS-translucent overlays want a different model: **clamped-max**, where simultaneously hovered + pressed shows whichever target is _stronger_ per-key, whatever its priority. [`useGestureLayer`](./api/hooks#usegesturelayerstates-options) at `@rootnative/inertia/gesture-layer` is the convenience layer for that model — supply per-state target maps (`rest` / `hovered` / `focused` / `focusVisible` / `pressed` / `disabled`), the hook owns the worklet, the disabled override, and the transition.

```tsx
import { useGestureLayer } from '@rootnative/inertia/gesture-layer'

const { style, handlers } = useGestureLayer({
  rest: { opacity: 0, backgroundColor: 'transparent' },
  hovered: { opacity: 0.08, backgroundColor: '#000' },
  pressed: { opacity: 0.12, backgroundColor: '#000' },
})
```

Numeric keys compose via clamped-max; color keys compose via priority cascade (`hovered → focused → focusVisible → pressed`); `disabled` sits on top of both. The result also carries `states` — the per-state 0↔1 progress shared values behind the composed style — so extra styles can derive from the same gesture wiring (e.g. `useShadow({ from, to, progress: states.hovered })` for an elevation crossfade) without a second `useGesture` call. Reach for plain `useGesture` if the composition model doesn't fit (additive blends, multiply, per-key custom rules).

## When you need drag, pan, or swipe

The `gesture` prop covers Pressable-shaped states — anything that boils down to "active / inactive / focused / hovered". For continuous, value-bearing gestures (a thumb that follows the finger, a sheet that flicks closed, a carousel with momentum), reach for the [gestures adapter](./gestures-adapter): `useDrag`, `usePan`, `useSwipe`. It's an opt-in sibling package so the core library doesn't ship a `react-native-gesture-handler` peer for apps that only animate buttons.

A fully gesture-driven `Slider` is the canonical example the core package can't build alone — the thumb's position has to track touch X continuously, and that's what the adapter is for.
