---
sidebar_position: 1
---

# Hooks

The escape-hatch surface — drop here when you need imperative control beyond what the props expose.

The value-layer hooks (`useMotionValue`, `useSpring`, `useTransform`, `useScroll`) compose with `useAnimatedStyle` and every other Reanimated primitive — they return real shared values, not wrapped abstractions. Reach for them when an animation is gesture-driven, scroll-driven, or otherwise needs to live outside the declarative `animate` flow.

## `useMotionValue(initial)`

Create an animatable value owned by JS but readable from worklets. A thin pass-through over Reanimated's `useSharedValue` — the returned `SharedValue<T>` works anywhere a shared value is accepted (`useAnimatedStyle`, `useDerivedValue`, the other value hooks below).

```tsx
import { useMotionValue, Motion } from '@onlynative/inertia'
import { useAnimatedStyle } from 'react-native-reanimated'

function Draggable() {
  const x = useMotionValue(0)

  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }],
  }))

  return (
    <Motion.View
      style={style}
      onTouchMove={(e) => (x.value = e.nativeEvent.pageX)}
    />
  )
}
```

We intentionally don't wrap the shared value in a `MotionValue` class — adding a `{ get, set, value }` shell would force consumers to unwrap it at every Reanimated boundary and would break worklet capture. The bare shared value _is_ the public surface.

| Signature                                                | Returns          |
| -------------------------------------------------------- | ---------------- |
| `useMotionValue<T extends number \| string>(initial: T)` | `SharedValue<T>` |

## `useSpring(target, config?)`

Animate a shared value toward `target` with spring physics, using Inertia's react-spring vocabulary (`tension` / `friction` / `mass`).

`target` can be a plain number — the spring re-runs whenever the prop changes — or another `SharedValue<number>`, in which case the spring is driven by a UI-thread reaction. Both paths bottom out at the same `withSpring` call; the split is just which thread observes the source.

```tsx
import { useMotionValue, useSpring, Motion } from '@onlynative/inertia'
import { useAnimatedStyle } from 'react-native-reanimated'

function Followable({ targetX }: { targetX: number }) {
  // Plain-number path: re-springs whenever `targetX` changes.
  const x = useSpring(targetX, { tension: 200, friction: 18 })

  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }],
  }))
  return <Motion.View style={style} />
}

function Chained() {
  // SharedValue path: drag drives `dragX`, spring smooths it into `x`.
  const dragX = useMotionValue(0)
  const x = useSpring(dragX)

  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }],
  }))
  return <Motion.View style={style} />
}
```

| Signature                                                                     | Returns               |
| ----------------------------------------------------------------------------- | --------------------- |
| `useSpring(target: number \| SharedValue<number>, config?: SpringTransition)` | `SharedValue<number>` |

Config accepts every field of [`SpringTransition`](../transitions): `tension`, `friction`, `mass`, `velocity`, `restSpeedThreshold`, `restDisplacementThreshold`. Reanimated's raw `stiffness` / `damping` names are never accepted — that conversion is private to the library.

## `useTransform(...)`

Derive a value from one or more shared values. Two overloads:

### Interpolation

Map a numeric shared value onto a range of numbers or colors. Output type drives whether the underlying call is `interpolate` (numerics) or `interpolateColor` (color strings).

```tsx
import { useMotionValue, useTransform } from '@onlynative/inertia'

const scroll = useMotionValue(0)
const headerOpacity = useTransform(scroll, [0, 100], [1, 0])
const headerTint = useTransform(scroll, [0, 100], ['#ffffff', '#000000'])
```

| Signature                                                                                                              | Returns               |
| ---------------------------------------------------------------------------------------------------------------------- | --------------------- |
| `useTransform(value: SharedValue<number>, inputRange: number[], outputRange: number[], options?: UseTransformOptions)` | `SharedValue<number>` |
| `useTransform(value: SharedValue<number>, inputRange: number[], outputRange: string[], options?: UseTransformOptions)` | `SharedValue<string>` |

`UseTransformOptions`:

| Field              | Type                                | Default   | Notes                                 |
| ------------------ | ----------------------------------- | --------- | ------------------------------------- |
| `extrapolateLeft`  | `'clamp' \| 'identity' \| 'extend'` | `'clamp'` | Behavior below the first input value. |
| `extrapolateRight` | `'clamp' \| 'identity' \| 'extend'` | `'clamp'` | Behavior above the last input value.  |

The input range must be monotonically increasing.

### Transformer worklet

Derive any value from any number of shared values via a worklet.

```tsx
const x = useMotionValue(0)
const y = useMotionValue(0)
const distance = useTransform(() => Math.sqrt(x.value ** 2 + y.value ** 2))
```

| Signature                               | Returns          |
| --------------------------------------- | ---------------- |
| `useTransform<T>(transformer: () => T)` | `SharedValue<T>` |

The transformer must be a worklet. Plain functions are auto-wrapped with the `'worklet'` directive at JS time — the same treatment user-supplied easing gets — so you don't need to remember it. The transformer must be pure: no captured JS-thread refs, no calls to non-worklet APIs.

## `useScroll()`

Track the scroll offset of a `Motion.ScrollView` as shared values. Scroll events fire on the UI thread, so the returned values are safe to read from any worklet without a JS-thread bounce.

```tsx
import { useScroll, useTransform, Motion } from '@onlynative/inertia'
import { useAnimatedStyle } from 'react-native-reanimated'

function StickyHeader() {
  const { scrollY, onScroll } = useScroll()
  const headerOpacity = useTransform(scrollY, [0, 100], [1, 0])

  // Shared values feed `useAnimatedStyle`, not `animate`. The `animate` prop
  // takes plain values that the resolver bakes into `withSpring` /
  // `withTiming` calls on the JS thread; shared values are the right fit
  // for continuous, externally-driven inputs (scroll, gestures).
  const headerStyle = useAnimatedStyle(() => ({ opacity: headerOpacity.value }))

  return (
    <>
      <Motion.View style={headerStyle} />
      <Motion.ScrollView onScroll={onScroll} scrollEventThrottle={16}>
        {/* …content… */}
      </Motion.ScrollView>
    </>
  )
}
```

Returns:

| Field      | Type                                                       | Notes                                                                                                                 |
| ---------- | ---------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `scrollX`  | `SharedValue<number>`                                      | Horizontal scroll offset in points.                                                                                   |
| `scrollY`  | `SharedValue<number>`                                      | Vertical scroll offset in points.                                                                                     |
| `onScroll` | `(event: NativeSyntheticEvent<NativeScrollEvent>) => void` | Pass to `Motion.ScrollView`'s `onScroll` prop. Worklet-backed; safe to forward to any Reanimated-animated scrollable. |

Set `scrollEventThrottle={16}` on the `ScrollView` for steady 60 Hz updates; without it, Android can dispatch less frequently than iOS.

## `useGesture(transition?)`

The hook-form of the [`gesture` prop](../gestures). Reach for it when one Pressable's gesture state needs to drive multiple animated views — a focus ring rendered as a sibling, an MD3 state-layer halo that overlays the content, a content tint and a separate icon-color animation, etc. The prop-form only animates the receiver's own style; the hook gives you the underlying 0↔1 progress shared values to feed into any number of `useAnimatedStyle` blocks.

```tsx
import { useGesture } from '@onlynative/inertia'
import Animated, {
  interpolateColor,
  useAnimatedStyle,
} from 'react-native-reanimated'

function StateLayerButton() {
  const { pressed, focused, focusVisible, hovered, handlers } = useGesture({
    pressed: { type: 'timing', duration: 100 },
    hovered: { type: 'timing', duration: 150 },
    focused: { type: 'timing', duration: 200 },
  })

  const ringStyle = useAnimatedStyle(() => ({ opacity: focusVisible.value }))
  const haloStyle = useAnimatedStyle(() => ({
    opacity: Math.max(
      hovered.value * 0.08,
      focused.value * 0.1,
      pressed.value * 0.1,
    ),
  }))

  return (
    <Pressable {...handlers}>
      <Animated.View pointerEvents="none" style={ringStyle} />
      <Animated.View pointerEvents="none" style={haloStyle} />
    </Pressable>
  )
}
```

Returns:

| Field          | Type                  | Notes                                                                                              |
| -------------- | --------------------- | -------------------------------------------------------------------------------------------------- |
| `pressed`      | `SharedValue<number>` | 0↔1 progress for the pressed layer.                                                                |
| `focused`      | `SharedValue<number>` | 0↔1 progress for any focus modality.                                                               |
| `focusVisible` | `SharedValue<number>` | 0↔1 progress for keyboard-only focus (W3C `:focus-visible` semantics).                             |
| `hovered`      | `SharedValue<number>` | 0↔1 progress for hover (web only — stays at 0 on native).                                          |
| `handlers`     | `UseGestureHandlers`  | `{ onPressIn, onPressOut, onHoverIn, onHoverOut, onFocus, onBlur }`. Spread on the host Pressable. |

Transitions follow the same shape as the `gesture` prop's accompanying `transition`:

- `useGesture({ type: 'timing', duration: 150 })` — same config for every layer.
- `useGesture({ pressed: {...}, hovered: {...}, focused: {...}, focusVisible: {...} })` — per-layer.
- Layers without an explicit transition fall back to the library default spring.
- `<MotionConfig reducedMotion>` is respected — when reduced motion is active, every transition collapses to `'no-animation'` and progress snaps instead of interpolating.

The shared values and the handler bag are **identity-stable** across renders — safe to pass to memoized children. To compose with consumer handlers (e.g. your own `onPressIn` for analytics), wrap manually:

```tsx
<Pressable
  {...handlers}
  onPressIn={(e) => {
    track('press')
    handlers.onPressIn()
  }}
/>
```

When `useGesture` and the `gesture` prop describe the same scenario, prefer the prop — fewer moving parts. The hook is the escape hatch for compositions the prop can't express.

## `useVariants(variants, initial?)`

Build a controller for a variants map. Pass it through `controller={...}` to drive transitions imperatively.

```ts
import { useVariants } from '@onlynative/inertia'

const variants = {
  open: { opacity: 1, translateY: 0 },
  closed: { opacity: 0, translateY: 100 },
} as const

const controller = useVariants(variants, 'closed')
controller.transitionTo('open')
console.log(controller.current) // 'open'
```

Returns `{ current, transitionTo, subscribe }`:

| Field          | Type                               | Notes                                                            |
| -------------- | ---------------------------------- | ---------------------------------------------------------------- |
| `current`      | `keyof V & string`                 | Active variant key. Read-only — change it via `transitionTo`.    |
| `transitionTo` | `(next: keyof V & string) => void` | No-op if `next === current`. Warns on unknown keys in dev.       |
| `subscribe`    | `(listener) => () => void`         | Internal. Motion primitives subscribe via the `controller` prop. |

The controller is identity-stable — the hook returns the same object across renders.

See [Variants](../variants) for the props-side usage.

## `useMotionConfig()`

Read the active `<MotionConfig>` value:

```ts
import { useMotionConfig } from '@onlynative/inertia'

const { reducedMotion } = useMotionConfig()
// 'user' | 'never' | 'always'
```

Returns the default (`{ reducedMotion: 'user' }`) when no provider is in the tree.

## `useShouldReduceMotion()`

Resolve the active reduced-motion mode to a boolean. `'user'` consults Reanimated's OS-backed hook; `'never'` and `'always'` shortcut to `false` / `true`.

```ts
import { useShouldReduceMotion } from '@onlynative/inertia'

function MyVideoIntro() {
  const reduce = useShouldReduceMotion()
  if (reduce) return <StaticPoster />
  return <AnimatedIntro />
}
```

This is what every Motion primitive uses to decide whether to swap transitions for `'no-animation'`. Subscribes to OS changes — components re-render when the user toggles the setting at runtime.

## `usePresence()`

Read the per-child presence context inside a custom component you'd like to behave like a Motion primitive under `<Presence>`:

```ts
import { usePresence } from '@onlynative/inertia'

function CustomExitable() {
  const presence = usePresence()
  // presence is null when no <Presence> ancestor exists
  // presence?.isPresent flips false when the parent removes us
  // presence?.safeToRemove() — call once exit completes
}
```

See [Presence](../presence) for the higher-level prop-driven usage.
