---
sidebar_position: 1
---

# Migrating from raw Reanimated

Inertia is a thin wrapper over `react-native-reanimated` — every animation it produces could have been written by hand with `useSharedValue` + `useAnimatedStyle`. The win is that the common patterns collapse into props. This page maps the patterns we keep rewriting in `@onlynative/ui` and other downstream consumers onto the Inertia equivalents.

If a pattern below isn't covered, the likely answer is "drop down to the hooks layer" — Inertia exposes `useMotionValue` / `useSpring` / `useTransform` so you don't have to leave the package.

## State-layer fills (Material Design 3)

The bread-and-butter pattern: a `Pressable` with a coloured layer that fades in on hover, focus, and press. Roughly 13 components in `@onlynative/ui` share this exact shape.

### Before — raw Reanimated

```tsx
import { Pressable } from 'react-native'
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated'

const AnimatedPressable = Animated.createAnimatedComponent(Pressable)

export function Button({ onPress, label }: Props) {
  const press = useSharedValue(0)
  const focus = useSharedValue(0)
  const hover = useSharedValue(0)

  const animatedStyle = useAnimatedStyle(() => {
    'worklet'
    let bg = interpolateColor(hover.value, [0, 1], ['transparent', '#0001'])
    bg = interpolateColor(focus.value, [0, 1], [bg, '#0002'])
    bg = interpolateColor(press.value, [0, 1], [bg, '#0003'])
    return { backgroundColor: bg }
  })

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={() => (press.value = withTiming(1, { duration: 120 }))}
      onPressOut={() => (press.value = withTiming(0, { duration: 120 }))}
      onFocus={() => (focus.value = withTiming(1, { duration: 120 }))}
      onBlur={() => (focus.value = withTiming(0, { duration: 120 }))}
      onHoverIn={() => (hover.value = withTiming(1, { duration: 120 }))}
      onHoverOut={() => (hover.value = withTiming(0, { duration: 120 }))}
      style={[styles.button, animatedStyle]}
    >
      <Text>{label}</Text>
    </AnimatedPressable>
  )
}
```

### After — Inertia

```tsx
import { Motion } from '@onlynative/inertia'

export function Button({ onPress, label }: Props) {
  return (
    <Motion.Pressable
      onPress={onPress}
      gesture={{
        hovered: { backgroundColor: '#0001' },
        focused: { backgroundColor: '#0002' },
        pressed: { backgroundColor: '#0003' },
      }}
      transition={{ type: 'timing', duration: 120 }}
      style={styles.button}
    >
      <Text>{label}</Text>
    </Motion.Pressable>
  )
}
```

Three shared values, one animated style, and six handler callbacks collapse into one `gesture` prop.

### Layered blending preserves the cross-fade

The chained-`interpolateColor` form above blends three independent layers so a release-while-still-hovered shows a real cross-fade. Inertia's `gesture` matches that semantically: each declared sub-state owns its own progress (0↔1) and the worklet composites layers in priority order (`hovered → focused → focusVisible → pressed`). When you release while still hovered, the press layer fades back to 0 independently — the hover layer stays at 1, so the value lands on the hover target rather than snapping back to base.

To configure per-layer fade timing (MD3 spec uses ~50 ms in, ~150 ms out), pass per-state entries on `transition`:

```tsx
transition={{
  backgroundColor: { type: 'timing', duration: 120 },
  pressed:  { type: 'timing', duration: 50 },
  hovered:  { type: 'timing', duration: 90 },
}}
```

Without per-layer entries, layers inherit the top-level `transition` (or fall back to the library default spring).

### `style` must be a value, not a function

`Motion.Pressable` inherits Reanimated's `createAnimatedComponent` wrapper, which silently drops the function-form `style={({ pressed }) => ...}` that RN's `Pressable` accepts. Drive press/focus/hover styling through `gesture` (as above) or compute conditional styles once in render. See [primitives/pressable](../primitives/pressable#style-must-be-a-value-not-a-function) for the full caveat.

## Mount-on-appear (fade in, slide up)

### Before

```tsx
const opacity = useSharedValue(0)
const translateY = useSharedValue(20)

useEffect(() => {
  opacity.value = withTiming(1, { duration: 200 })
  translateY.value = withSpring(0, { stiffness: 180, damping: 22, mass: 1 })
}, [])

const animatedStyle = useAnimatedStyle(() => ({
  opacity: opacity.value,
  transform: [{ translateY: translateY.value }],
}))

return <Animated.View style={[styles.card, animatedStyle]} />
```

### After

```tsx
<Motion.View
  initial={{ opacity: 0, translateY: 20 }}
  animate={{ opacity: 1, translateY: 0 }}
  transition={{
    opacity: { type: 'timing', duration: 200 },
    translateY: { type: 'spring', tension: 180, friction: 22 },
  }}
  style={styles.card}
/>
```

The Reanimated config translates 1:1 — `stiffness` → `tension`, `damping` → `friction`, `mass` → `mass`. See the [transition shapes](../transitions#porting-from-raw-reanimated-stiffness--damping) for the table.

## Toggle progress (Switch / Checkbox / Radio)

A boolean that animates between two states.

### Before

```tsx
const progress = useSharedValue(checked ? 1 : 0)

useEffect(() => {
  progress.value = withSpring(checked ? 1 : 0, {
    stiffness: 380,
    damping: 32,
  })
}, [checked])

const thumbStyle = useAnimatedStyle(() => ({
  transform: [{ translateX: progress.value * 24 }],
}))
const trackStyle = useAnimatedStyle(() => ({
  backgroundColor: interpolateColor(
    progress.value,
    [0, 1],
    [colors.surface, colors.primary],
  ),
}))
```

### After

```tsx
const variants = {
  off: { translateX: 0, backgroundColor: colors.surface },
  on: { translateX: 24, backgroundColor: colors.primary },
} as const

<Motion.View
  variants={variants}
  animate={checked ? 'on' : 'off'}
  transition={{ type: 'spring', tension: 380, friction: 32 }}
  style={styles.thumb}
/>
```

One variant map, one prop swap on `animate`. `useEffect` and the manual `withSpring` call both go away.

For programmatic chaining (`onChange` with async work, ripple animations), use `useVariants(variants)` instead and drive the controller from JS:

```tsx
const controller = useVariants(variants)
controller.transitionTo(checked ? 'on' : 'off')

<Motion.View controller={controller} variants={variants} />
```

## Drag / pan / swipe

These wait for the [`@onlynative/inertia-gestures`](../gestures-adapter) adapter (PanGestureHandler under the hood). The hooks return ready-made shared values you wire into the same props — no `setNativeProps`, no manual `withDecay` after release.

```tsx
import { useDrag } from '@onlynative/inertia-gestures'

const { gesture, animatedStyle } = useDrag({
  axis: 'x',
  constraints: { left: -100, right: 100 },
  elastic: 0.3,
})

<GestureDetector gesture={gesture}>
  <Animated.View style={[styles.card, animatedStyle]} />
</GestureDetector>
```

If your gesture layer is already PanResponder-based and you don't want to add a peer dep, the existing code keeps working — Inertia doesn't replace `react-native-gesture-handler` flows in the core package.

## Looping / infinite animations

### Before

```tsx
const angle = useSharedValue(0)
useEffect(() => {
  angle.value = withRepeat(
    withTiming(360, { duration: 1200 }),
    -1, // -1 means infinite
    false, // don't reverse
  )
}, [])
const style = useAnimatedStyle(() => ({
  transform: [{ rotate: `${angle.value}deg` }],
}))
```

### After

```tsx
<Motion.View
  animate={{ rotate: 360 }}
  transition={{
    type: 'timing',
    duration: 1200,
    repeat: { count: 'infinite', alternate: false },
  }}
/>
```

The three `withRepeat` flags collapse into one shape. See [sequences and repeat](../sequences#repeat).

## Custom easing

Reanimated 3.9+ validates that `easing` is a worklet inside nested-transition contexts (variants, sequences, per-property maps). A bare arrow function crashes there.

### Before

```tsx
import { Easing } from 'react-native-reanimated'

// Crashes inside a variant if you forget the directive.
const easing = (t: number) => {
  'worklet'
  return Math.pow(t, 3)
}
```

### After

```tsx
// Plain function — the resolver wraps it as a worklet at JS time.
const easing = (t: number) => Math.pow(t, 3)

<Motion.View
  variants={{
    rest: { translateY: 0 },
    bounce: { translateY: -16 },
  }}
  transition={{ type: 'timing', duration: 280, easing }}
  animate="bounce"
/>
```

Easing fns must still be **pure** — no captured JS-thread refs, no closures over component state. The wrapping only fixes the worklet-validation; it can't safely move JS-thread state across the boundary.

## Mount/unmount transitions (`AnimatePresence`)

If you have an existing `AnimatePresence` from another lib, swap the import:

```diff
- import { AnimatePresence } from 'some-other-lib'
+ import { Presence } from '@onlynative/inertia'

  function Toast({ visible }: Props) {
    return (
-     <AnimatePresence>
+     <Presence>
        {visible ? (
          <Motion.View
            key="toast"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
        ) : null}
-     </AnimatePresence>
+     </Presence>
    )
  }
```

`<Presence>` automatically applies `pointerEvents: 'none'` to exiting children — the "two clicks to re-open the popover" bug doesn't reproduce. See [Presence](../presence) for the full contract.

## When _not_ to migrate

Some patterns are still better off as raw Reanimated:

- **Frame-by-frame data viz** — d3-style charts that read shared values inside `useDerivedValue` and feed them into SVG props. The Inertia public surface targets `style` keys; SVG attribute interpolation lives in the hooks layer or in raw Reanimated.
- **Custom physics simulations** — anything where you'd be reaching into `withDecay` callback signatures, `cancelAnimation`, or `runOnUI` directly. Drop down to the hooks.
- **Layout / shared-element transitions** — deferred to v1.x. If you're animating list reordering or screen-to-screen hero transitions, keep using Reanimated's `Layout` API directly for now.
- **Slider / continuous gesture range UI** — until [`@onlynative/inertia-gestures`](../gestures-adapter) covers the pattern (v0.2 still in flight), keep the hand-rolled PanResponder + `useSharedValue` flow.

The hooks layer is intentionally the same shape as Reanimated's so dropping down doesn't feel like switching tools.

## Testing migrated components

The Reanimated mock that ships with Jest is **static-render-only** — animations don't actually run, and `useAnimatedStyle` is captured at the at-rest values. After migrating, your existing tests assert against `initial` styles by default, which is usually wrong.

Inertia ships a test helper that flushes animations to their target state in one call. See [Testing](../testing) for the API.

## Stuck?

Open an issue with the before/after pair you're trying to migrate. The patterns in this guide came from `@onlynative/ui`'s real components — if your shape isn't covered, it should be.
