---
sidebar_position: 1
---

# Hooks

The escape-hatch surface — drop here when you need imperative control beyond what the props expose.

The value-layer hooks (`useMotionValue`, `useSpring`, `useBooleanSpring`, `useTransform`, `useShadow`, `useColorTransition`, `useScroll`) compose with `useAnimatedStyle` and every other Reanimated primitive — they return real shared values (or, in `useShadow` / `useColorTransition`'s case, an animated style fragment), not wrapped abstractions. Reach for them when an animation is gesture-driven, scroll-driven, or otherwise needs to live outside the declarative `animate` flow.

## `useMotionValue(initial)`

Create an animatable value owned by JS but readable from worklets. A thin pass-through over Reanimated's `useSharedValue` — the returned `SharedValue<T>` works anywhere a shared value is accepted (`useAnimatedStyle`, `useDerivedValue`, the other value hooks below).

```tsx
import { useMotionValue, Motion } from '@rootnative/inertia'
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
import { useMotionValue, useSpring, Motion } from '@rootnative/inertia'
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

## `useBooleanSpring(active, config?)`

Sugar over `useSpring` for the recurring "spring 0↔1 progress from a boolean" shape — checkbox checks, accordion expansions, drawer open/closed states, focus rings, and every other binary UI flip that wants spring physics rather than a hard cut.

```tsx
import {
  useBooleanSpring,
  useColorTransition,
  useShadow,
} from '@rootnative/inertia'

function Card({ raised }: { raised: boolean }) {
  // One driver, multiple downstream styles. The same progress feeds the
  // shadow tween and the surface-color shift in lockstep.
  const progress = useBooleanSpring(raised, { tension: 180, friction: 18 })

  const shadowStyle = useShadow({
    from: REST_SHADOW,
    to: RAISED_SHADOW,
    progress,
  })
  const fillStyle = useColorTransition(progress, ['#ffffff', '#f8fafc'])

  return <Motion.View style={[styles.card, fillStyle, shadowStyle]} />
}
```

The returned shared value sits at `0` when `active` is `false` and animates toward `1` when it flips to `true` (and back on the reverse flip). The spring re-runs whenever `active` changes.

| Signature                                                      | Returns               |
| -------------------------------------------------------------- | --------------------- |
| `useBooleanSpring(active: boolean, config?: SpringTransition)` | `SharedValue<number>` |

Config follows the same react-spring vocabulary as `useSpring` (`tension` / `friction` / `mass`); omit it for the library defaults. Note that like `useSpring`, this hook does **not** consult `<MotionConfig reducedMotion>` — it always interpolates. If the value must respect reduced motion, drive it through `useAnimation` (which gates on the config) or gate the target yourself with `useShouldReduceMotion()`.

**`useBooleanSpring` vs `useSpring(active ? 1 : 0)`.** Identical mechanics — `useBooleanSpring` is the named version of the pattern so the call site reads as the boolean it represents, not as a ternary. Reach for it whenever the source is a boolean prop and the target is a 0↔1 progress value to feed into `useShadow` / `useColorTransition` / `useTransform` / a hand-rolled `useAnimatedStyle`.

**`useBooleanSpring` vs `useAnimation(active ? 1 : 0, { type: 'spring', ... })`.** Same animation either way; `useBooleanSpring` is the shorter spelling for the spring-only case. Drop to `useAnimation` if you need a `timing` curve, a `decay`, or a `repeat`.

## `useTransform(...)`

Derive a value from one or more shared values. Two overloads:

### Interpolation

Map a numeric shared value onto a range of numbers or colors. Output type drives whether the underlying call is `interpolate` (numerics) or `interpolateColor` (color strings).

```tsx
import { useMotionValue, useTransform } from '@rootnative/inertia'

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

## `useShadow({ from, to, progress })`

Interpolate between two shadow configs as `progress` moves 0→1. Returns an animated style fragment you spread onto any Reanimated-aware view (`Motion.*` or a hand-rolled `Animated.View`) — no other props required on the host.

```tsx
import { Motion, useShadow, useSpring } from '@rootnative/inertia'

function ElevatedCard({ raised }: { raised: boolean }) {
  // Whatever drives `progress` is your concern — a spring, a scroll-derived
  // useTransform, a gesture progress value. The hook is a pure interpolator;
  // it does not animate on its own.
  const progress = useSpring(raised ? 1 : 0, { tension: 180, friction: 18 })

  const shadowStyle = useShadow({
    from: {
      shadowOpacity: 0.08,
      shadowRadius: 2,
      shadowOffset: { width: 0, height: 1 },
      elevation: 1,
    },
    to: {
      shadowOpacity: 0.24,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 10 },
      elevation: 10,
    },
    progress,
  })

  return <Motion.View style={[styles.card, shadowStyle]} />
}
```

`ShadowConfig` accepts the same flat shadow keys as `Motion.View`'s `animate` surface, plus the nested `shadowOffset` source:

| Field           | Type                                  | Notes                                                      |
| --------------- | ------------------------------------- | ---------------------------------------------------------- |
| `shadowOpacity` | `number`                              | Standard iOS shadow opacity.                               |
| `shadowRadius`  | `number`                              | Blur radius in points.                                     |
| `shadowOffset`  | `{ width?: number; height?: number }` | Single-value form — width/height each tween independently. |
| `elevation`     | `number`                              | Android elevation. iOS-only consumers can leave it off.    |
| `shadowColor`   | `string`                              | Color string. Interpolated via `interpolateColor`.         |

Only keys present on at least one side appear in the output style — there's no overhead for keys you don't use. A key present on one side and absent from the other tweens from / to the absent side's natural zero (`0`, `'transparent'`, or `{ width: 0, height: 0 }`).

| Signature                                                                            | Returns                               |
| ------------------------------------------------------------------------------------ | ------------------------------------- |
| `useShadow({ from: ShadowConfig; to: ShadowConfig; progress: SharedValue<number> })` | Animated style (spread onto `style`). |

**`useShadow` vs the declarative `animate` path.** If a state change in your component already swaps between two shadow configs (`animate={raised ? RAISED : REST}`), the `animate` prop is simpler — no hook needed. Reach for `useShadow` when the source of progress isn't a render-driven state swap: scroll position, drag progress, a `useSpring` driven by a shared value, or anywhere else the value-layer is the right abstraction. The example screen in the gallery drives it from a `useSpring`; wiring it to `useScroll` + `useTransform` for a scroll-driven elevation cascade is a one-line change.

## `useColorTransition(progress, [from, to], options?)`

Interpolate a single color channel between `from` and `to` as `progress` moves 0→1. Returns an animated style fragment with one color key — spread it onto any Reanimated-aware view alongside other style fragments (a `useShadow` result, a hand-rolled `useAnimatedStyle`, plain `StyleSheet` entries).

```tsx
import {
  Motion,
  useBooleanSpring,
  useColorTransition,
} from '@rootnative/inertia'

function Chip({ active }: { active: boolean }) {
  // Drive the tween from a boolean spring. The same progress feeds two
  // independent color channels — fill and ring shift in lockstep.
  const progress = useBooleanSpring(active, { tension: 200, friction: 18 })

  const fillStyle = useColorTransition(progress, ['#e5e7eb', '#4f46e5'])
  const ringStyle = useColorTransition(progress, ['#d1d5db', '#312e81'], {
    key: 'borderColor',
  })

  return <Motion.View style={[styles.chip, fillStyle, ringStyle]} />
}
```

The hook is a pure interpolator; it does not animate on its own. Drive `progress` upstream with a `useSpring`, `useBooleanSpring`, scroll-derived `useTransform`, gesture progress, or anything else producing a 0↔1 shared value. Values outside `[0, 1]` clamp.

`options.key` chooses which RN style slot the interpolated color is emitted under:

| Key                                                                                             | Default | Notes                                                              |
| ----------------------------------------------------------------------------------------------- | ------- | ------------------------------------------------------------------ |
| `backgroundColor`                                                                               | ✓       | State-layer haloes, card fills, chip surfaces.                     |
| `color`                                                                                         |         | Animate text color (combine with `Motion.Text` or a plain text).   |
| `borderColor` / `borderTopColor` / `borderRightColor` / `borderBottomColor` / `borderLeftColor` |         | Focus rings, outline transitions.                                  |
| `tintColor`                                                                                     |         | `Motion.Image` tint.                                               |
| `shadowColor`                                                                                   |         | Shadow color shifts. (For full shadow tweens, prefer `useShadow`.) |

| Signature                                                                                                                  | Returns                               |
| -------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| `useColorTransition(progress: SharedValue<number>, range: readonly [string, string], options?: UseColorTransitionOptions)` | Animated style (spread onto `style`). |

**`useColorTransition` vs `useTransform` with a color output range.** `useTransform(progress, [0, 1], [from, to])` returns a raw `SharedValue<string>` — reach for it when you need to compose the color into a hand-rolled `useAnimatedStyle` (mixing with a `Math.max(...)` halo opacity, feeding into a gradient, etc.). `useColorTransition` is the one-call convenience for the dominant case: tween a single color slot and spread the result onto `style`.

**`useColorTransition` vs the declarative `animate` path.** If a state change already swaps between two colors (`animate={active ? { backgroundColor: A } : { backgroundColor: B }}`), the `animate` prop is simpler. Reach for `useColorTransition` when the source of progress isn't a render-driven state swap, or when several color slots need to shift in lockstep from one shared driver (the chip example above — one spring, three color channels).

## `useAnimation(target, transition?)`

The general-purpose value-layer hook: drive a `SharedValue<number>` toward `target` with any `TransitionConfig`. Reach for it when you need raw `useSharedValue + useEffect + withTiming` (or `withSpring`, or `withRepeat`) **outside** the declarative `animate` flow — boolean state progress on a widget with multiple animated children, indeterminate progress on a list of `useAnimatedStyle` consumers, anywhere the value layer is the right abstraction.

```tsx
import { useAnimation } from '@rootnative/inertia'

// Toggle progress driven by a prop. Spring physics, react-spring vocab.
const progress = useAnimation(isChecked ? 1 : 0, {
  type: 'spring',
  tension: 380,
  friction: 33,
})

// Float a label when the field has a value. Timing curve.
const floated = useAnimation(hasValue ? 1 : 0, {
  type: 'timing',
  duration: 150,
})

// Indeterminate progress slider — loops forever, snaps back each cycle.
const slide = useAnimation(1, {
  type: 'timing',
  duration: 1800,
  repeat: { count: 'infinite', alternate: false },
})
```

| Signature                                                     | Returns               |
| ------------------------------------------------------------- | --------------------- |
| `useAnimation(target: number, transition?: TransitionConfig)` | `SharedValue<number>` |

The hook re-runs the animation whenever `target` changes or the transition's structural signature changes. A fresh literal each render (`{ type: 'timing', duration: 200 }` rebuilt on every call) doesn't re-fire — only structural changes do. Reduced motion (`<MotionConfig reducedMotion>`) collapses the transition to `'no-animation'` and snaps the value.

**`useAnimation` vs `useSpring`.** They overlap on the spring case — `useAnimation(target, { type: 'spring', ... })` and `useSpring(target, { ... })` produce the same animation. Prefer `useSpring` when you only want spring physics; it also accepts a `SharedValue<number>` as the target for UI-thread-reactive smoothing (a gesture-driven smoothing source). `useAnimation` is the general-purpose hook — accepts any `TransitionConfig` including `timing`, `decay`, `no-animation`, and `repeat` — but is JS-thread-driven only.

**`useAnimation` vs `Motion.View animate={{...}}`.** Use the `animate` prop when one Motion primitive owns the animated value end-to-end. Use `useAnimation` when the same value drives several `useAnimatedStyle` blocks across siblings — there's no Motion primitive to attach `animate` to in that case.

## `useScroll()`

Track the scroll offset of a `Motion.ScrollView` as shared values. Scroll events fire on the UI thread, so the returned values are safe to read from any worklet without a JS-thread bounce.

```tsx
import { useScroll, useTransform, Motion } from '@rootnative/inertia'
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
import { useGesture } from '@rootnative/inertia'
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

## `useGestureLayer(states, options?)`

A higher-level helper over `useGesture` for the **strongest-active-layer-wins** composition model used by MD3 state-layer haloes and iOS-translucent overlays. You supply per-state target maps; the hook owns the four gesture progress shared values, the `disabled` override, the worklet, and the transition. Lives at the `@rootnative/inertia/gesture-layer` subpath so apps that don't need it don't pay for it.

```tsx
import { Pressable } from 'react-native'
import Animated from 'react-native-reanimated'
import { useGestureLayer } from '@rootnative/inertia/gesture-layer'

function SwitchHalo({ disabled }: { disabled?: boolean }) {
  const { style, handlers } = useGestureLayer(
    {
      rest: { opacity: 0, backgroundColor: 'transparent' },
      hovered: { opacity: 0.08, backgroundColor: '#000' },
      focused: { opacity: 0.1, backgroundColor: '#000' },
      pressed: { opacity: 0.12, backgroundColor: '#000' },
    },
    { disabled, transition: { type: 'timing', duration: 150 } },
  )

  return (
    <Pressable {...handlers}>
      <Animated.View style={style} />
    </Pressable>
  )
}
```

### Composition model

- **Numeric keys** (`opacity`, `scale`, `borderWidth`, …) compose via clamped-max with `rest` as the floor: `out = max(rest, …for each active layer: lerp(rest, layer, progress))`. Multiple states active simultaneously raise the value to the strongest layer, not the sum — this is the MD3 halo pattern.
- **Color keys** (any string value) compose via priority cascade with `interpolateColor`, lowest priority first: `hovered → focused → focusVisible → pressed`. Clamped-max doesn't apply to colors; this matches the cascade used by the declarative `gesture` prop.
- **Disabled** sits at the top of the cascade for both numeric and color keys — when active, it lerps the composed value toward the `disabled` target. The `disabled` flag is JS-side, not gesture-driven.

### States

| Key            | Notes                                                                                                                                               |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `rest`         | Base values, applied when no other layer is active. Missing keys default to `0` (numeric) / `'transparent'` (color).                                |
| `hovered`      | Web-only hover. No-op on native.                                                                                                                    |
| `focused`      | Any focus modality (mouse, touch, keyboard).                                                                                                        |
| `focusVisible` | Keyboard-only focus (W3C `:focus-visible`). On native, behaves identically to `focused`.                                                            |
| `pressed`      | Active touch / pointer-down.                                                                                                                        |
| `disabled`     | Gated by `options.disabled`. Overrides every gesture layer when active; per-layer transitions don't apply (top-level transition or default spring). |

Every state key is optional. Values inside each state are a flat map of style keys to either a number (numeric layer) or a string (color layer). The hook doesn't validate that string values are valid colors — passing `borderStyle: 'solid'` will crash inside the worklet. Keep string values to color strings.

### Options

| Field        | Type                                          | Notes                                                                                                                                                                                                                                                                                                                     |
| ------------ | --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `disabled`   | `boolean`                                     | Activates the `disabled` layer (or `rest` if `disabled` is undefined).                                                                                                                                                                                                                                                    |
| `transition` | `TransitionConfig \| GestureLayerTransitions` | Forwarded to the underlying `useGesture`. Either one config for every gesture layer, or per-layer (`{ pressed, focused, focusVisible, hovered }`). Reduced motion collapses every transition to `'no-animation'`. Per-layer transitions don't apply to `disabled` — it uses the top-level config (or the default spring). |

### Returns

| Field      | Type                 | Notes                                                                                                |
| ---------- | -------------------- | ---------------------------------------------------------------------------------------------------- |
| `style`    | Animated style       | Spread onto an `Animated.View` or a `Motion.*`'s `style`.                                            |
| `handlers` | `UseGestureHandlers` | `{ onPressIn, onPressOut, onHoverIn, onHoverOut, onFocus, onBlur }`. Spread on the host `Pressable`. |

```tsx
import { useGestureLayer } from '@rootnative/inertia/gesture-layer'
```

**`useGestureLayer` vs the declarative `gesture` prop.** The prop composites states as a fixed **priority cascade** (`hovered → focused → focusVisible → pressed`) — when two layers are fully active, the value converges to the higher-priority layer's target, regardless of which is numerically stronger. `useGestureLayer` composites numerics via **clamped-max** — pressing while hovered shows whichever target is _stronger_ per-key, whatever its priority. The MD3 / iOS-translucent halo wants clamped-max so a weaker press target can't visually "dim" an active hover layer. Reach for the prop for ordinary button feedback (`{ scale: 0.96 }` on press layering over an opacity hover); reach for this hook when targets are state-layer overlays whose strongest value should win.

**`useGestureLayer` vs `useGesture` + custom worklet.** `useGesture` returns the raw 0↔1 progress shared values. Use it for compositions this hook doesn't express — additive blends, per-key custom rules, multi-target outputs (e.g. a halo plus a separate ring that uses different math). `useGestureLayer` is the convenience layer for the one composition model it owns.

## `useVariants(variants, initial?)`

Build a controller for a variants map. Pass it through `controller={...}` to drive transitions imperatively.

```ts
import { useVariants } from '@rootnative/inertia'

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
import { useMotionConfig } from '@rootnative/inertia'

const { reducedMotion } = useMotionConfig()
// 'user' | 'never' | 'always'
```

Returns the default (`{ reducedMotion: 'user' }`) when no provider is in the tree.

## `useShouldReduceMotion()`

Resolve the active reduced-motion mode to a boolean. `'user'` consults Reanimated's OS-backed hook; `'never'` and `'always'` shortcut to `false` / `true`.

```ts
import { useShouldReduceMotion } from '@rootnative/inertia'

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
import { usePresence } from '@rootnative/inertia'

function CustomExitable() {
  const presence = usePresence()
  // presence is null when no <Presence> ancestor exists
  // presence?.isPresent flips false when the parent removes us
  // presence?.safeToRemove() — call once exit completes
}
```

See [Presence](../presence) for the higher-level prop-driven usage.

## `buildReleaseAnimation(transition, toValue)`

Worklet-safe single-step animation builder. Mirrors a subset of the internal `resolveTransition` for the UI-thread path where the transition config is picked at gesture-release time, not at render time. Supports `spring` / `timing` / `decay` / `no-animation`; sequences, top-level `repeat`, and easing-function auto-worklet-wrapping are not.

```ts
import { buildReleaseAnimation } from '@rootnative/inertia'
import { Gesture } from 'react-native-gesture-handler'

const pan = Gesture.Pan().onEnd((e) => {
  'worklet'
  // Spring to a snap target with the release velocity preserved.
  position.value = buildReleaseAnimation(
    { type: 'spring', velocity: e.velocityX, friction: 26, tension: 170 },
    snapTarget,
  ) as number
})
```

For decay transitions, the second argument is ignored — decay decelerates from the SV's current position via its own physics.

| Signature                                                              | Returns                                                                  |
| ---------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| `buildReleaseAnimation(transition: TransitionConfig, toValue: number)` | Reanimated animation value (assign to a `SharedValue<number>` directly). |

Most consumers reach for `useDrag({ onRelease })` from `@rootnative/inertia-gestures` instead — it wraps this builder behind a per-axis return shape. Use `buildReleaseAnimation` directly when you're authoring a custom `Gesture.*().onEnd(...)` worklet outside the adapter hooks.

## `useTouchDrag(options?)`

PanResponder-backed drag hook. The keyboard-a11y and zero-extra-peer-dep counterpart to `useDrag` from `@rootnative/inertia-gestures` — both share the same `onRelease` shape, but `useTouchDrag` lives in core (`@rootnative/inertia/touch`) and returns `panHandlers` to spread on a `Pressable` / `View` instead of a `gesture` object for `<GestureDetector>`.

```tsx
import { Motion } from '@rootnative/inertia'
import { useTouchDrag } from '@rootnative/inertia/touch'
import { Pressable } from 'react-native'

function Slider({ ticks }: { ticks: number[] }) {
  const drag = useTouchDrag({
    axis: 'x',
    constraints: { left: 0, right: 280 },
    onRelease: (e) => {
      const snap = nearestTick(e.x, ticks)
      return { x: { type: 'spring', to: snap, velocity: e.velocity.x } }
    },
  })

  return (
    <Pressable
      accessibilityRole="adjustable"
      onKeyDown={handleKey} // arrow keys compose alongside the drag
      {...drag.panHandlers}
    >
      <Motion.View style={[styles.thumb, drag.animatedStyle]} />
    </Pressable>
  )
}
```

| Option        | Type                                           | Default  | Notes                                                                                    |
| ------------- | ---------------------------------------------- | -------- | ---------------------------------------------------------------------------------------- |
| `axis`        | `'x' \| 'y' \| 'both'`                         | `'both'` | Lock the gesture to one axis.                                                            |
| `constraints` | `{ left?, right?, top?, bottom? }`             | none     | Bounds in px from the resting position. Each side independently optional.                |
| `elastic`     | `number` (0–1)                                 | `0`      | Rubber-band coefficient past `constraints`. `0` hard-clamps.                             |
| `onDragStart` | `() => void`                                   | none     | Fires on JS thread when drag begins.                                                     |
| `onDragEnd`   | `(info: { x, y, velocity: { x, y } }) => void` | none     | Fires on JS thread when drag ends. Velocity normalized to px/sec.                        |
| `onRelease`   | `(info) => ReleaseResult \| void`              | none     | JS-thread release transition. Same shape as the gesture-handler `useDrag`'s `onRelease`. |

Returns `{ panHandlers, animatedStyle, dragX, dragY, isDragging }`.

**When to pick `useTouchDrag` over `useDrag` from `@rootnative/inertia-gestures`:** you need keyboard a11y on the dragged element (arrow keys, `PageUp` / `PageDown`), OR you don't want to take `react-native-gesture-handler` as a peer dep. **When to skip it:** you're already using `react-native-gesture-handler` elsewhere — the gesture-handler `useDrag`'s release velocity is UI-thread and slightly more precise; consistency across the app trumps a small per-call win.
