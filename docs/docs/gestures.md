---
sidebar_position: 7
description: One gesture prop on every Motion primitive, with no handlers mounted at all when the prop is omitted.
---

# Gestures

Every Motion primitive has one `gesture` prop. There is no `whileTap` or `whilePress` family, and no separate "pressable" variant. When you omit the prop, Inertia mounts no handlers, so the prop has zero overhead.

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

| Sub-state      | Active when                                                                                                                                                                                                                                                        | Backed by                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pressed`      | Any pointer is down on the component — finger, mouse, or pen — until it lifts or the gesture is cancelled.                                                                                                                                                         | `onTouchStart` / `End` / `Cancel`, `onPointerDown` / `Up` / `Cancel` (web), plus `onPressIn` / `onPressOut`.                                                                                                                                                                                                                                                                                                                                                                                   |
| `focused`      | The component owns focus, regardless of how it arrived (mouse, touch, or keyboard).                                                                                                                                                                                | `onFocus` / `onBlur`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `focusVisible` | The focus shows a ring (W3C `:focus-visible`): on web, the browser's `:focus-visible` for the focused element; keyboard focus everywhere. On native — where focus always arrives via D-pad / hardware keyboard / screen reader — behaves identically to `focused`. | `onFocus`, which asks the focused element whether it matches `:focus-visible`. A module-level input-modality tracker (web `keydown` vs `pointerdown` / `mousedown` / `touchstart`; a ⌘, Ctrl or Alt chord does not count) is the fallback when the event has no focused target or the browser does not support the selector. The tracker's `document` listeners attach when the first component that declares `focusVisible` mounts, not at import, so the package stays `sideEffects: false`. |
| `hovered`      | Pointer is over the component. **Web-only**, no-op on native.                                                                                                                                                                                                      | `onMouseEnter` / `onMouseLeave`.                                                                                                                                                                                                                                                                                                                                                                                                                                                               |

A sub-state layers over the base `animate` target, property by property. When a sub-state releases, the property animates back to the value in `animate`. If `animate` doesn't set that property, the property rests at **the value in your static `style`**. So the focus ring above returns to the `borderColor` of the stylesheet of the element. You don't have to repeat a resting value in `animate` only because a sub-state names it:

```tsx
const styles = StyleSheet.create({
  field: { borderColor: '#d4d4d8', borderWidth: 1 },
})

// Rests at #d4d4d8, animates to #4f46e5 on focus, returns to #d4d4d8.
<Motion.View style={styles.field} gesture={{ focused: { borderColor: '#4f46e5' } }} />
```

When neither `animate` nor `style` gives a value, the property falls back to its type default (`0` for a number, `transparent` for a color). The same rule covers `exit` targets and a property that appears in only some `variants` branches. A key that any of them names joins the animated set, but it rests on your style until something drives it.

Use `focused` for a state-layer fill (any focus, including click focus on web) and `focusVisible` for a focus ring. Declare both, and you get the correct behaviour: a click on a button shows the state layer, and a tab to the button shows the state layer **and** the ring.

### `focusVisible` follows the browser on web

In the focus event, Inertia asks the focused element whether it matches `:focus-visible`. So the ring shows where the browser would draw its own focus outline, and an app that removes that outline loses no indicator. The browser knows cases that no input tracker sees. For example, after a click that focuses nothing, Chromium marks the next focus that a script moves as `:focus-visible`. A text input matches `:focus-visible` after a click too, because the browser draws its outline there.

The input-modality tracker is the fallback in three cases: a call with no event, a focus event that a script dispatches (it moves no focus), and a browser without `:focus-visible`. If you call a [`useGesture`](./api/hooks#usegesturetransition) `onFocus` yourself, pass the event: `handlers.onFocus(event)`.

**In jsdom tests**, `:focus-visible` matches every focused element, so a test that calls `element.focus()` always sees the ring. `fireEvent.focus` moves no focus and gets the fallback: fire a `keydown` or a `pointerdown` on `document` first to set the modality.

### Write `pressed` relative to rest, not to `hovered`

`hovered` never activates on a touch device. So a `pressed` target that only makes sense as a step down from `hovered` makes **no motion at all** on native:

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

On web this works: hover lifts the card, and press settles it. On iOS and Android there is no hover layer, so the cascade runs from rest to `pressed`, and the two values are the same. The animation does nothing, and nothing warns you, because a target equal to the resting value is valid.

Write each sub-state as an absolute target from **rest**. Treat `hovered` as an intermediate step that only some platforms see:

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

The general rule: **check each sub-state against rest on its own**, because that is the only comparison that a touch device makes.

## Priority

When several sub-states are active at once, they composite as a **priority cascade** in this order. A later layer composites over an earlier one:

`hovered` → `focused` → `focusVisible` → `pressed`

Each declared sub-state owns a progress shared value (0 to 1). The value fades in when the sub-state activates and fades out when it releases. The `useAnimatedStyle` worklet composites the layers per property:

```
v = base
v = lerp(v, hovered.value,      progressHovered)      // if declared
v = lerp(v, focused.value,      progressFocused)      // if declared
v = lerp(v, focusVisible.value, progressFocusVisible) // if declared
v = lerp(v, pressed.value,      progressPressed)      // if declared
```

A color key uses `interpolateColor` instead of `lerp`. When one sub-state is active, the rule is: the declared layer with the highest priority wins. A `pressed` target overrides every layer below it. The gain of layered composition shows in **overlapping transitions**. When you release a press while the pointer still hovers, the press layer fades back to 0 on its own, while the hover layer stays at 1. So the value lands on the hover target and doesn't snap back to the base.

## Per-layer transitions

Each layer animates with its own transition. Inertia resolves it in this order:

1. `transition.<stateName>` on the primitive (for example `transition.pressed`)
2. The top-level `transition`, when you write it as a top-level transition object
3. The library default (a spring)

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

Per-layer entries (`pressed`, `hovered`, …) and per-property entries (`backgroundColor`, `opacity`, …) share the same `transition` map. They don't conflict, because no gesture-layer name is a valid style prop.

## Type inference

A `gesture` sub-state has the same `style`-derived type as `animate`. So `tintColor` autocompletes inside `gesture.pressed` on `Motion.Image`, and `Motion.View` rejects it.

## Composing user handlers

Inertia composes its internal handlers with the handlers that you attach:

```tsx
<Motion.Pressable
  onPressIn={(event) => analytics.track('press', event)}
  gesture={{ pressed: { scale: 0.96 } }}
/>
```

Your `onPressIn` runs first, then the internal pressed-state setter. The same order applies to every event that the gesture prop subscribes to.

## When the prop isn't enough — `useGesture`

The `gesture` prop animates the own style of the primitive. Sometimes the gesture state of one Pressable must drive **several** animated views: a focus ring as a sibling, an MD3 state-layer halo over the content, a separate icon-color animation. Then use [`useGesture`](./api/hooks#usegesturetransition), the hook form of this prop. It returns the progress shared values (0 to 1) for `pressed`, `focused`, `focusVisible`, and `hovered`, plus a set of handlers to spread on a `Pressable`. Feed the shared values into as many `useAnimatedStyle` blocks as you need.

```tsx
const { pressed, focused, hovered, handlers } = useGesture()
// ...drive a focus ring, a halo, a tint — each from the same gesture state
<Pressable {...handlers}>{children}</Pressable>
```

The prop and the hook share the layered-blend model, the `isFocusVisible()` rules, and the `<MotionConfig reducedMotion>` gate. They are the same machinery with two surfaces.

## When you want MD3 state-layer overlays — `useGestureLayer`

The `gesture` prop composites states as a fixed **priority cascade**. When hovered and pressed are both fully active, the value converges to the `pressed` target, because `pressed` is highest in the cascade, whichever target is numerically stronger. An MD3 state-layer halo or an iOS translucent overlay wants a different model: **clamped-max**. There, hovered plus pressed shows the _stronger_ target per key, whatever its priority. [`useGestureLayer`](./api/hooks#usegesturelayerstates-options) at `@rootnative/inertia/gesture-layer` is the convenience layer for that model. You supply a target map per state (`rest`, `hovered`, `focused`, `focusVisible`, `pressed`, `disabled`). The hook owns the worklet, the disabled override, and the transition.

```tsx
import { useGestureLayer } from '@rootnative/inertia/gesture-layer'

const { style, handlers } = useGestureLayer({
  rest: { opacity: 0, backgroundColor: 'transparent' },
  hovered: { opacity: 0.08, backgroundColor: '#000' },
  pressed: { opacity: 0.12, backgroundColor: '#000' },
})
```

A numeric key composes with clamped-max. A color key composes with the priority cascade (`hovered → focused → focusVisible → pressed`). `disabled` sits on top of both. The result also carries `states`, the progress shared values (0 to 1) per state behind the composed style. So an extra style can derive from the same gesture wiring without a second `useGesture` call, for example `useShadow({ from, to, progress: states.hovered })` for an elevation crossfade. Use plain `useGesture` when the composition model doesn't fit (an additive blend, a multiply, a custom rule per key).

## When you need drag, pan, or swipe

The `gesture` prop covers Pressable-shaped states: active, inactive, focused, and hovered. For a continuous gesture with a value (a thumb that follows the finger, a sheet that flicks closed, a carousel with momentum), use the [gestures adapter](./gestures-adapter): `useDrag`, `usePan`, and `useSwipe`. It's an opt-in sibling package, so the core library has no `react-native-gesture-handler` peer for an app that only animates buttons.

A fully gesture-driven `Slider` is the canonical example that the core package can't build alone. The position of the thumb has to follow the touch X continuously, and that is what the adapter is for.
