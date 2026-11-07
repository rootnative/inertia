---
sidebar_position: 1
description: Maps the useSharedValue and useAnimatedStyle patterns we keep rewriting onto the props that replace them.
---

# Migrating from raw Reanimated

Inertia is a thin wrapper over `react-native-reanimated`. You could write every animation that it makes by hand with `useSharedValue` and `useAnimatedStyle`. The gain is that the common patterns collapse into props. This page maps the patterns that component libraries and apps write again and again onto the Inertia equivalents.

If a pattern isn't on this page, the likely answer is "use the hooks layer". Inertia exports `useMotionValue`, `useSpring`, `useTransform`, `useAnimation`, and `useGesture`, so you don't have to leave the package.

## State-layer fills (Material Design 3)

The most common pattern: a `Pressable` with a coloured layer that fades in on hover, focus, and press. In a component library, a dozen components can share this exact shape.

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
import { Motion } from '@rootnative/inertia'

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

### Layered blending keeps the crossfade

The chained `interpolateColor` form above blends three independent layers, so a release while the pointer still hovers shows a real crossfade. The `gesture` prop of Inertia does the same. Each declared sub-state owns its own progress (0 to 1), and the worklet composites the layers in priority order (`hovered → focused → focusVisible → pressed`). When you release while the pointer still hovers, the press layer fades back to 0 on its own. The hover layer stays at 1, so the value lands on the hover target and doesn't snap back to the base.

To set the fade timing per layer (the MD3 spec uses about 50 ms in and about 150 ms out), pass an entry per state on `transition`:

```tsx
transition={{
  backgroundColor: { type: 'timing', duration: 120 },
  pressed:  { type: 'timing', duration: 50 },
  hovered:  { type: 'timing', duration: 90 },
}}
```

Without an entry per layer, the layers inherit the top-level `transition`, or fall back to the library default spring.

### `style` must be a value, not a function

Every `Motion.*` primitive **throws in dev** when `style` is a function. Otherwise the `createAnimatedComponent` wrapper of Reanimated would drop the function form `style={({ pressed }) => ...}`, which the `Pressable` of React Native accepts, with no message. Drive the press, focus, and hover styles through `gesture` (as above), or compute a conditional style once in render. See [primitives/pressable](../primitives/pressable#style-must-be-a-value-not-a-function) for the full caveat.

### When the gesture drives sibling overlays — `useGesture`

The `gesture` prop animates the _own_ style of the primitive. A focus ring as a sibling, an MD3 state-layer halo over the content, or a content tint on a child View are out of reach for the prop. [`useGesture`](../api/hooks#usegesturetransition) can reach them. It returns the same four progress shared values (0 to 1) that the prop is built on, plus a set of handlers to spread on a `Pressable`. Feed the shared values into as many `useAnimatedStyle` blocks as you need.

```tsx
import { useGesture } from '@rootnative/inertia'
import Animated, {
  interpolateColor,
  useAnimatedStyle,
} from 'react-native-reanimated'

export function ButtonWithRing({ onPress, label }: Props) {
  const { pressed, focused, focusVisible, hovered, handlers } = useGesture({
    pressed: { type: 'timing', duration: 100 },
    hovered: { type: 'timing', duration: 150 },
    focused: { type: 'timing', duration: 200 },
  })

  const ringStyle = useAnimatedStyle(() => ({
    opacity: focusVisible.value,
  }))
  const bgStyle = useAnimatedStyle(() => {
    let bg = interpolateColor(hovered.value, [0, 1], ['transparent', '#0001'])
    bg = interpolateColor(focused.value, [0, 1], [bg, '#0002'])
    bg = interpolateColor(pressed.value, [0, 1], [bg, '#0003'])
    return { backgroundColor: bg }
  })

  return (
    <View>
      <Animated.View pointerEvents="none" style={[styles.ring, ringStyle]} />
      <Pressable
        {...handlers}
        onPress={onPress}
        style={[styles.button, bgStyle]}
      >
        <Text>{label}</Text>
      </Pressable>
    </View>
  )
}
```

`useGesture` and the `gesture` prop share the same machinery, the same rules, and the same reduced-motion gate. They are two surfaces over one engine. The rule: if your animation lives on the style of one component, use the prop. If it spans siblings, use the hook.

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

The Reanimated config translates 1:1: `stiffness` becomes `tension`, `damping` becomes `friction`, and `mass` stays `mass`. See the [transition shapes](../transitions#porting-from-raw-reanimated-stiffness--damping) for the table.

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

One variant map, one prop swap on `animate`. The `useEffect` and the manual `withSpring` call both go away.

For programmatic chaining (an `onChange` with async work, a ripple animation), use `useVariants(variants)` instead, and drive the controller from JS:

```tsx
const controller = useVariants(variants)
controller.transitionTo(checked ? 'on' : 'off')

<Motion.View controller={controller} variants={variants} />
```

### When one progress drives multiple sibling views — `useAnimation`

`variants` lives on one Motion primitive. A real Switch or Checkbox is three or four views (a track, a thumb, a ripple halo) that all read the same progress. The pattern for that is [`useAnimation`](../api/hooks#useanimationtarget-transition), the general-purpose hook of Inertia that drives a `SharedValue<number>` toward a target with any transition. It shares the progress across as many `useAnimatedStyle` blocks as you need.

```tsx
import { useAnimation, useGesture } from '@rootnative/inertia'
import Animated, {
  interpolate,
  interpolateColor,
  useAnimatedStyle,
} from 'react-native-reanimated'

export function Switch({ value, onValueChange }: Props) {
  const progress = useAnimation(value ? 1 : 0, {
    type: 'spring',
    tension: 380,
    friction: 33,
  })
  const { pressed, focused, hovered, handlers } = useGesture({
    pressed: { type: 'timing', duration: 120 },
    hovered: { type: 'timing', duration: 150 },
    focused: { type: 'timing', duration: 200 },
  })

  const trackStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      progress.value,
      [0, 1],
      [colors.surface, colors.primary],
    ),
  }))
  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: interpolate(progress.value, [0, 1], [0, 24]) }],
  }))
  const haloStyle = useAnimatedStyle(() => ({
    opacity: Math.max(
      hovered.value * 0.08,
      focused.value * 0.1,
      pressed.value * 0.1,
    ),
  }))

  return (
    <Pressable
      {...handlers}
      onPress={() => onValueChange(!value)}
      style={styles.track}
    >
      <Animated.View style={[styles.trackFill, trackStyle]} />
      <Animated.View pointerEvents="none" style={[styles.halo, haloStyle]} />
      <Animated.View style={[styles.thumb, thumbStyle]} />
    </Pressable>
  )
}
```

What collapsed:

- `const progress = useSharedValue(value ? 1 : 0)` plus a `useEffect` that calls `withSpring`: replaced by one `useAnimation(value ? 1 : 0, transition)`.
- Three `useSharedValue` calls for press, focus, and hover, plus six `useCallback` handlers: replaced by one `useGesture(transition)` destructure plus `{...handlers}`.
- `stiffness` and `damping` become `tension` and `friction`. The numbers are identical. Only the names change.
- The `isFocusVisible()` modality logic is inside the hook. You wire nothing.

`useAnimation` also handles indeterminate progress (loops, sequences). See [Looping / infinite animations](#looping--infinite-animations) below.

## Drag / pan / swipe

The [`@rootnative/inertia-gestures`](../gestures-adapter) adapter covers these, with `usePanGesture` inside. The hooks return ready shared values that you wire into the same props. You need no `setNativeProps` and no manual `withDecay` after release.

```tsx
import { useDrag } from '@rootnative/inertia-gestures'

const { gesture, animatedStyle } = useDrag({
  axis: 'x',
  constraints: { left: -100, right: 100 },
  elastic: 0.3,
})

<GestureDetector gesture={gesture}>
  <Animated.View style={[styles.card, animatedStyle]} />
</GestureDetector>
```

If your gesture layer already uses PanResponder, and you don't want a new peer dependency, the existing code keeps working. The core package doesn't replace `react-native-gesture-handler` flows.

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

### Indeterminate progress (a loop on a standalone shared value)

Sometimes the loop has to drive a shared value that the rest of your component reads: an indeterminate `LinearProgress` slide, a `CircularProgress` rotation, an idle spinner whose rotation feeds several animated styles. Then there is no Motion primitive to hold `animate`. [`useAnimation`](../api/hooks#useanimationtarget-transition) carries the same repeat config to a standalone `SharedValue<number>`. Start the value at 0 with `{ from: 0 }`. Reanimated runs each turn of a loop from the value at its start, so a loop that starts at its target doesn't move.

```tsx
import { useAnimation } from '@rootnative/inertia'
import Animated, { useAnimatedStyle } from 'react-native-reanimated'

export function Spinner() {
  const rotation = useAnimation(
    1,
    {
      type: 'timing',
      duration: 1400,
      repeat: { count: 'infinite', alternate: false },
    },
    { from: 0 },
  )

  const style = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value * 360}deg` }],
  }))

  return <Animated.View style={[styles.ring, style]} />
}
```

The same shared value can feed a second `useAnimatedStyle` block (for example, a trailing dot whose opacity follows `rotation.value`). That is the gain over `Motion.View animate={{ rotate: 360 }}`: one driver, many consumers. When the component unmounts, the hook cancels the animation, so you write no `cancelAnimation` code. To start the loop from an event instead of on mount, use [`useAnimator`](../api/hooks#useanimator) on a [`useMotionValue(0)`](../api/hooks#usemotionvalueinitial).

## Custom easing

Reanimated 3.9+ checks that `easing` is a worklet inside a nested-transition context (variants, sequences, per-property maps). A bare arrow function crashes there.

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

An easing function must still be **pure**: no captured JS-thread refs, no closure over component state. The wrap only fixes the worklet check. It can't safely move JS-thread state across the boundary.

## Mount/unmount transitions (`AnimatePresence`)

If you have an `AnimatePresence` from another library, swap the import:

```diff
- import { AnimatePresence } from 'some-other-lib'
+ import { Presence } from '@rootnative/inertia'

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

`<Presence>` applies `pointerEvents: 'none'` to an exiting child for you, so the "two taps to open the popover again" defect doesn't happen. See [Presence](../presence) for the full contract.

## When _not_ to migrate

Some patterns are still better as raw Reanimated:

- **Frame-by-frame data visualization.** A d3-style chart reads shared values inside `useDerivedValue` and feeds them into SVG props. The public surface of Inertia targets `style` keys. SVG attribute interpolation lives in the hooks layer or in raw Reanimated.
- **A custom physics simulation.** Anything where you use the `withDecay` callback signatures, `cancelAnimation`, or `runOnUI` directly. Use the hooks.
- **A shared element that carries more than the standard key set.** The [`layout` prop and `layoutId`](../layout) cover layout and hero transitions, including window-coordinate measurement across parents with different offsets, and a style carry for `opacity`, `borderRadius`, and the color keys. The carried set is fixed and has no configuration. So a hero that must interpolate something else (padding, border width, a gradient) between screens is still a job for raw Reanimated.
- **A slider or continuous gesture UI with unusual requirements.** [`useDrag`](../gestures-adapter) and [`useTouchDrag`](../api/hooks#usetouchdragoptions) cover the standard drag and slider shapes. Keep the hand-written PanResponder and `useSharedValue` flow only when you need custom gesture arbitration that those hooks don't express.

The hooks layer has the same shape as Reanimated on purpose, so a move down doesn't feel like a change of tools.

## Testing migrated components

The Reanimated mock that ships with Jest is **static-render only**. Animations don't run, and `useAnimatedStyle` captures the values at rest. After a migration, your existing tests assert against the `initial` styles by default, which is usually wrong.

Inertia ships a test helper that flushes animations to their target state in one call. See [Testing](../testing) for the API.

## Stuck?

Open an issue with the before and after pair that you try to migrate. The patterns in this guide came from real components in a component library. If your shape isn't here, it should be.
