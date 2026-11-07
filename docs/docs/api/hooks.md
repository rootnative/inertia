---
sidebar_position: 1
description: The escape-hatch surface, for imperative control beyond what the props expose.
---

# Hooks

The hooks are the escape hatch. Use them when you need imperative control beyond what the props expose.

The value-layer hooks (`useMotionValue`, `useSpring`, `useBooleanSpring`, `useTransform`, `useShadow`, `useColorTransition`, `useInterpolatedStyle`, `useScroll`, `useHideOnScroll`, `useInView`, `useValueChange`) compose with `useAnimatedStyle` and every other Reanimated primitive. They return real shared values, not wrapped abstractions. `useShadow`, `useColorTransition`, and `useInterpolatedStyle` return an animated style fragment instead. Use the hooks when a gesture or a scroll drives an animation, or when the animation must live outside the declarative `animate` flow.

:::note Unmount cleanup
`useMotionValue`, `useSpring`, `useBooleanSpring`, and `useAnimation` cancel an animation in flight on unmount. So an animation that still settles, or a `repeat: 'infinite'` animation, stops its worklet when its component is gone. You don't need a manual `cancelAnimation` cleanup effect for that case. To cancel while the component stays mounted, import `cancelAnimation` from the [`/reanimated`](./reanimated-interop) interop subpath and call it yourself. The `Motion.*` primitives get the same unmount cleanup for their internal shared values.
:::

## `useMotionValue(initial)`

Creates an animatable value that JS owns and that a worklet can read. It's a thin pass-through over the `useSharedValue` of Reanimated. The returned `SharedValue<T>` works everywhere that a shared value is accepted (`useAnimatedStyle`, `useDerivedValue`, the other value hooks below).

The generic is **unconstrained**, so it holds anything that `useSharedValue` holds, not only animatable values:

```ts
const x = useMotionValue(0) // SharedValue<number>
const tint = useMotionValue('#fff') // SharedValue<string>
const cellTops = useMotionValue<number[]>([]) // one measurement per item
const ready = useMotionValue(false) // SharedValue<boolean>
```

The other value hooks (`useSpring`, `useTransform`) are numeric, because interpolation is numeric. This hook is storage, so its type isn't narrowed to match them.

Two rules come from Reanimated, not from this hook:

- **Reassign a structured value. Don't mutate it.** `cellTops.value.push(y)` updates nothing. Write a new array or record instead.
- **Only numbers and colour strings animate.** You write a structured value from a handler or an effect. You never pass it to `withSpring` or `withTiming`.

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

We don't wrap the shared value in a `MotionValue` class on purpose. A `{ get, set, value }` shell would force you to unwrap it at every Reanimated boundary, and it would break worklet capture. The bare shared value _is_ the public surface.

| Signature                                                | Returns          |
| -------------------------------------------------------- | ---------------- |
| `useMotionValue<T extends number \| string>(initial: T)` | `SharedValue<T>` |

## `useSpring(target, config?)`

Animates a shared value toward `target` with spring physics, in the react-spring vocabulary of Inertia (`tension`, `friction`, `mass`).

`target` can be a plain number, and then the spring runs again whenever the prop changes. It can also be another `SharedValue<number>`, and then a UI-thread reaction drives the spring. Both paths end in the same `withSpring` call. The difference is only which thread observes the source.

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

| Signature                                                                                       | Returns               |
| ----------------------------------------------------------------------------------------------- | --------------------- |
| `useSpring(target: number \| SharedValue<number>, config?: SpringTransition \| TransitionName)` | `SharedValue<number>` |

`config` accepts every field of [`SpringTransition`](../transitions): `tension`, `friction`, `mass`, and `velocity`. The raw `stiffness` and `damping` names of Reanimated are never accepted. That conversion is private to the library.

`config` also accepts a [named transition](../motion-config#named-transitions). The hook is spring-only, so the name must be registered as a spring. A timing, decay, or no-animation name warns in dev and falls back to the default spring. Use `useAnimation` to honor the registered type. The same applies to `useBooleanSpring`.

The hook honours reduced motion. Under `<MotionConfig reducedMotion>`, the hook assigns the target to the output directly, with no spring, on both the plain-number path and the shared-value path. The same applies to `useBooleanSpring`.

## `useBooleanSpring(active, config?)`

A short form of `useSpring` for the common shape "a spring progress from 0 to 1 from a boolean": a checkbox check, an accordion expansion, a drawer open or closed, a focus ring, and every other binary UI change that wants spring physics instead of a hard cut.

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

The returned shared value sits at `0` when `active` is `false`. It animates toward `1` when `active` becomes `true`, and back when `active` becomes `false`. The spring runs again whenever `active` changes.

| Signature                                                                        | Returns               |
| -------------------------------------------------------------------------------- | --------------------- |
| `useBooleanSpring(active: boolean, config?: SpringTransition \| TransitionName)` | `SharedValue<number>` |

`config` takes the same react-spring vocabulary as `useSpring` (`tension`, `friction`, `mass`). Omit it for the library defaults. Like `useSpring`, this hook does **not** consult `<MotionConfig reducedMotion>`. It always interpolates. If the value must respect reduced motion, drive it through `useAnimation`, which gates on the config, or gate the target yourself with `useShouldReduceMotion()`.

**`useBooleanSpring` vs `useSpring(active ? 1 : 0)`.** The mechanics are identical. `useBooleanSpring` is the named version of the pattern, so the call site reads as the boolean, not as a ternary. Use it whenever the source is a boolean prop and the target is a progress value from 0 to 1 for `useShadow`, `useColorTransition`, `useTransform`, or a hand-written `useAnimatedStyle`.

**`useBooleanSpring` vs `useAnimation(active ? 1 : 0, { type: 'spring', ... })`.** The animation is the same. `useBooleanSpring` is the shorter spelling for the spring-only case. Use `useAnimation` when you need a `timing` curve, a `decay`, or a `repeat`.

## `useTransform(...)`

Derives a value from one or more shared values. It has two overloads:

### Interpolation

Maps a numeric shared value onto a range of numbers or colors. The output type decides whether the hook calls `interpolate` (numbers) or `interpolateColor` (color strings).

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

The input range must increase monotonically.

### Transformer worklet

Derives any value from any number of shared values through a worklet.

```tsx
const x = useMotionValue(0)
const y = useMotionValue(0)
const distance = useTransform(() => {
  'worklet'
  return Math.sqrt(x.value ** 2 + y.value ** 2)
})
```

| Signature                               | Returns          |
| --------------------------------------- | ---------------- |
| `useTransform<T>(transformer: () => T)` | `SharedValue<T>` |

The transformer must be a worklet. Add the `'worklet'` directive as its first statement, so that your Babel plugin captures the shared values that it reads as the closure of the worklet. A plain function warns in dev and can't track dependencies. The fallback wrapper closes over the opaque function reference, not over the shared values inside it, so the derived value refreshes only on a React re-render. A native build rejects it. The transformer must be pure: no captured JS-thread refs, no calls to APIs that aren't worklets.

## `useShadow({ from, to, progress })`

Interpolates between two shadow configs as `progress` moves from 0 to 1. It returns an animated style fragment. Spread it onto any view that Reanimated knows (`Motion.*` or a hand-written `Animated.View`). The host needs no other props.

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

`ShadowConfig` accepts the same flat shadow keys as the `animate` surface of `Motion.View`, plus the nested `shadowOffset` form:

| Field           | Type                                  | Notes                                                                    |
| --------------- | ------------------------------------- | ------------------------------------------------------------------------ |
| `shadowOpacity` | `number`                              | Standard iOS shadow opacity.                                             |
| `shadowRadius`  | `number`                              | Blur radius in points.                                                   |
| `shadowOffset`  | `{ width?: number; height?: number }` | Single-value form — width/height each tween independently.               |
| `elevation`     | `number`                              | Android elevation. iOS-only consumers can leave it off.                  |
| `shadowColor`   | `string`                              | Color string. Interpolated via `interpolateColor`.                       |
| `boxShadow`     | `string \| BoxShadowLayer[]`          | CSS box-shadow — the shadow surface on web and RN 0.76+ new-arch native. |

Only a key on at least one side appears in the output style. A key that you don't use has no cost. A key on one side only tweens from or to the natural zero of the other side (`0`, `'transparent'`, or `{ width: 0, height: 0 }`).

### Web shadows: `boxShadow`

The classic `shadow*` and `elevation` keys never reach the web renderer. The elevation surface of react-native-web is the CSS `box-shadow` string. `boxShadow` closes that gap. Pass the CSS string form that your design system already stores elevation tokens in (px lengths only), or structured `BoxShadowLayer` objects (`{ offsetX, offsetY, blurRadius?, spreadDistance?, color?, inset? }`, the same as the `BoxShadowValue` of React Native):

```tsx
const shadowStyle = useShadow({
  from: {
    boxShadow: '0px 1px 2px rgba(0,0,0,0.30), 0px 1px 3px 1px rgba(0,0,0,0.15)',
  },
  to: {
    boxShadow: '0px 2px 6px 2px rgba(0,0,0,0.15), 0px 1px 2px rgba(0,0,0,0.30)',
  },
  progress,
})
```

A multi-layer shadow interpolates per layer. When one side has fewer layers (including `'none'`), the hook pads it with invisible layers, the same as a CSS transition. Like `cubicBezier`, a malformed string **throws** at render and doesn't warn. Shadow tokens are built at theme setup, and a typo must fail there. Two paired layers with a different `inset` can't interpolate, and they also throw. The hook emits the interpolated value as a `boxShadow` style string. react-native-web passes it through as CSS, and React Native 0.76+ (new architecture) renders it natively. Old-architecture native ignores it, so keep the `shadow*` and `elevation` keys next to it for those targets.

| Signature                                                                            | Returns                               |
| ------------------------------------------------------------------------------------ | ------------------------------------- |
| `useShadow({ from: ShadowConfig; to: ShadowConfig; progress: SharedValue<number> })` | Animated style (spread onto `style`). |

**`useShadow` vs the declarative `animate` path.** If a state change in your component already swaps between two shadow configs (`animate={raised ? RAISED : REST}`), the `animate` prop is simpler, and you need no hook. Use `useShadow` when the source of the progress isn't a state swap in render: a scroll position, a drag progress, a `useSpring` that a shared value drives, or any other case where the value layer is the correct abstraction. The example screen in the gallery drives it from a `useSpring`. To drive an elevation cascade from a scroll, wire it to `useScroll` and `useTransform`. That is a one-line change.

## `useColorTransition(progress, [from, to], options?)`

Interpolates one color channel between `from` and `to` as `progress` moves from 0 to 1. It returns an animated style fragment with one color key. Spread it onto any view that Reanimated knows, next to other style fragments (a `useShadow` result, a hand-written `useAnimatedStyle`, plain `StyleSheet` entries).

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

The hook is a pure interpolator. It doesn't animate on its own. Drive `progress` with a `useSpring`, a `useBooleanSpring`, a `useTransform` from a scroll, a gesture progress, or anything else that makes a shared value from 0 to 1. A value outside `[0, 1]` clamps.

`options.key` chooses the React Native style key for the interpolated color:

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

**`useColorTransition` vs `useTransform` with a color output range.** `useTransform(progress, [0, 1], [from, to])` returns a raw `SharedValue<string>`. Use it when you compose the color into a hand-written `useAnimatedStyle`, for example with a `Math.max(...)` halo opacity, or as the input of a gradient. `useColorTransition` is the one-call form for the common case: tween one color key and spread the result onto `style`.

**`useColorTransition` vs the declarative `animate` path.** If a state change already swaps between two colors (`animate={active ? { backgroundColor: A } : { backgroundColor: B }}`), the `animate` prop is simpler. Use `useColorTransition` when the source of the progress isn't a state swap in render, or when several color keys must move together from one shared driver. The chip example above has one spring and three color channels.

## `useColorCascade(rest, layers, options?)`

Composites a **stack of color layers in priority order** over a base `rest` color. Each layer owns its own `progress` shared value and blends toward its color as that progress rises. At equal progress, a later layer wins over an earlier one. This is the value-layer form of the same fixed-priority cascade that the [`gesture` prop](../gestures) uses (Decision 5), for state colors that don't come from gestures: error, selected, activated, dragged.

```tsx
import { Motion, useBooleanSpring, useColorCascade } from '@rootnative/inertia'

function Field({ hovered, errored, focused }: FieldStates) {
  const hoverP = useBooleanSpring(hovered)
  const errorP = useBooleanSpring(errored)
  const focusP = useBooleanSpring(focused)

  // Priority order, lowest first — focus wins over error wins over hover,
  // each animating in on its own spring.
  const borderStyle = useColorCascade(
    colors.border,
    [
      { progress: hoverP, color: colors.borderHover },
      { progress: errorP, color: colors.borderError },
      { progress: focusP, color: colors.borderFocus },
    ],
    { key: 'borderColor' },
  )

  return <Motion.View style={[styles.field, borderStyle]} />
}
```

The chain equals the hand-written nested `interpolateColor` shape `focus(error(hover(rest)))`, in one hook and one worklet. `layers` is in priority order, **lowest first**, the same as the gesture cascade. The `progress` of each layer is a shared value from 0 to 1 that you drive (a `useSpring`, a `useBooleanSpring`, a gesture progress, …). The hook is a pure interpolator and doesn't animate on its own.

`options.key` takes the same [`ColorStyleKey`](#usecolortransitionprogress-from-to-options) set as `useColorTransition`. The default is `backgroundColor`.

| Signature                                                                                               | Returns                               |
| ------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| `useColorCascade(rest: string, layers: readonly ColorCascadeLayer[], options?: UseColorCascadeOptions)` | Animated style (spread onto `style`). |

where `ColorCascadeLayer` is `{ progress: SharedValue<number>; color: string }`.

**Rewiring a layer.** The hook resolves the chain on the JS thread and keeps its identity stable, so a new but equal `layers` array on every render costs nothing. A change of a colour, the `key`, the base `rest`, the layer count, or **the shared value that drives a layer** rewires the worklet. So a conditional progress (`{ progress: isError ? errorSpring : hoverSpring, color }`) behaves as written.

**`useColorCascade` vs `useColorTransition`.** `useColorTransition(progress, [rest, active])` is the single-layer fast path: one progress for one color key. Use `useColorCascade` when **independent** states each contribute a color and their precedence matters, for example a field border that can be hovered, in error, and focused at the same time. It doesn't replace the single-layer hook.

**Numeric cascades.** `useColorCascade` is color-only by design. If a numeric key needs the same precedence (for example, an outlined border that widens from 1 to 2 dp under error or focus), compose it separately. Drive each layer through `useInterpolatedStyle` and combine them with a `Math.max(...)` in `useTransform`, or use a hand-written `useAnimatedStyle`.

## `useInterpolatedStyle(progress, map, options?)`

Maps one `progress` shared value onto **N** style props at once, and returns an animated style fragment. It's the style-fragment counterpart of the output-range form of `useTransform`. `useTransform` gives you one interpolated value to compose by hand. `useInterpolatedStyle` interpolates a whole map of keys and returns a fragment that you spread. Use it when one driver (a collapse progress, a float progress, a scroll offset) feeds several style props. Otherwise that shape becomes a hand-written `useAnimatedStyle` over the Reanimated interop subpath.

```tsx
import {
  Motion,
  useBooleanSpring,
  useInterpolatedStyle,
} from '@rootnative/inertia'

function FloatingLabel({ focused }: { focused: boolean }) {
  const progress = useBooleanSpring(focused, { tension: 200, friction: 18 })

  // One driver → a translate + scale float, lifted into a transform array.
  const labelStyle = useInterpolatedStyle(progress, {
    translateY: [12, 0],
    scale: [1, 0.75],
  })

  return <Motion.Text style={[styles.label, labelStyle]}>Email</Motion.Text>
}
```

The hook is a pure interpolator. It doesn't animate on its own. Drive `progress` with a `useSpring`, a `useBooleanSpring`, a `useTransform` from a scroll, a gesture progress, or anything else that makes a shared value.

### Key routing

- **Numeric style keys** (`opacity`, `height`, `width`, `borderRadius`, `fontSize`, `top`, …) take number stops and go through `interpolate`. The hook emits them as top-level style keys.
- **Transform keys** (`translateX`, `translateY`, `scale`, `scaleX`, `scaleY`, `rotate`, `rotateX`, `rotateY`) take number stops. The hook puts them into one `transform` array, **in the order of the map**, the same key-order convention as the `animate` prop. A `rotate*` key takes degrees as a number and emits a `'<n>deg'` string.
- **Color keys** (`backgroundColor`, `color`, `borderColor` and its per-edge variants, `tintColor`, `shadowColor`) take color-string stops and go through `interpolateColor`. That is a multi-stop `useColorTransition` inside this hook. TypeScript checks the stop types: a number stop on a color key, or a color stop on a numeric or transform key, is a type error.

### Options

| Option        | Default                                                              | Notes                                                                                                                   |
| ------------- | -------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `inputRange`  | `[0, 1]` for 2-stop outputs; evenly-spaced across `[0, 1]` otherwise | Applies to every key. Provide it for multi-stop curves; its length must match each output length (dev-warns otherwise). |
| `extrapolate` | `'clamp'`                                                            | Edge behavior outside the input range for numeric keys. Color interpolation always clamps.                              |

```tsx
// Multi-stop, custom input range — fade in then out across a scroll span.
const fade = useInterpolatedStyle(
  scrollProgress,
  { opacity: [0, 1, 1, 0] },
  { inputRange: [0, 0.2, 0.8, 1] },
)
```

| Signature                                                                                                               | Returns                                                                            |
| ----------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `useInterpolatedStyle(progress: SharedValue<number>, map: InterpolatedStyleMap, options?: UseInterpolatedStyleOptions)` | `InterpolatedStyle<K>` — an animated style fragment typed from the map's own keys. |

The hook memoizes the map on a signature that keeps the key order, so a new but equal map literal on each render makes zero new UI-thread closures (the factory rule).

**The return type follows the map, so a `style` array needs no cast.** A map of view keys gives a fragment that satisfies `StyleProp<ViewStyle>`. The text-metric keys (`fontSize`, `lineHeight`, `letterSpacing`) give one that satisfies `StyleProp<TextStyle>`, and `tintColor` gives one that satisfies `StyleProp<ImageStyle>`. The transform keys collapse into the one `transform` array that the hook emits.

```tsx
const card = useInterpolatedStyle(scrollX, {
  scale: [0.84, 1, 0.84],
  opacity: [0.45, 1, 0.45],
})

// Narrows to ViewStyle — no `as ViewStyle` at the call site.
<Motion.View style={[styles.slot, card]} />
```

This matters because the own `useAnimatedStyle` of Reanimated resolves to `DefaultStyle` (`ViewStyle | ImageStyle | TextStyle`). A style **array** checks every member of that union, and `TextStyle` fails against `ViewStyle` on `cursor`. So a union return forced you to cast. The narrowing is exact, not only permissive: a `ViewStyle` slot still rejects a text-only fragment.

**`useInterpolatedStyle` vs `useTransform`.** `useTransform(progress, [0, 1], [a, b])` returns one raw `SharedValue` for you to compose. `useInterpolatedStyle` is the short form for the common case: several style or transform keys from one progress value, returned as a fragment that you spread. For a **function-valued** entry or a **multi-source** composition (`Math.max(a, b)`), use the worklet form of `useTransform` or a hand-written `useAnimatedStyle`. This hook stays fully declarative and hashable by design.

## `useAnimation(target, transition?)`

The general-purpose value-layer hook. It drives a `SharedValue<number>` toward `target` with any `TransitionConfig`. Use it when you need raw `useSharedValue + useEffect + withTiming` (or `withSpring`, or `withRepeat`) **outside** the declarative `animate` flow: a boolean state progress on a widget with several animated children, an indeterminate progress on a list of `useAnimatedStyle` consumers, or any other case where the value layer is the correct abstraction.

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
```

The value starts at `target`, so the first run moves nothing. Pass `{ from }` as the third argument to start somewhere else. The first run then animates from `from` to `target`, like `initial` on a `Motion.*` primitive. A loop needs it, because Reanimated runs each turn of a loop from the value at its start. `useAnimation(1, loop)` runs from 1 to 1. With `{ from: 0 }`, it runs from 0 to 1 on each turn.

```tsx
import { useAnimation } from '@rootnative/inertia'

// Indeterminate progress slider — loops forever, snaps back each cycle.
const slide = useAnimation(
  1,
  {
    type: 'timing',
    duration: 1800,
    repeat: { count: 'infinite', alternate: false },
  },
  { from: 0 },
)
```

The hook reads `from` once, on mount. To start a loop from an event instead of on mount, use [`useAnimator`](#useanimator) on a `useMotionValue(0)`.

| Signature                                                                                           | Returns               |
| --------------------------------------------------------------------------------------------------- | --------------------- |
| `useAnimation(target: number, transition?: TransitionConfig \| TransitionName, options?: { from })` | `SharedValue<number>` |

The hook runs the animation again whenever `target` changes or the structural signature of the transition changes. A new literal on each render (`{ type: 'timing', duration: 200 }` rebuilt on every call) doesn't fire it again. Only a structural change does. Reduced motion (`<MotionConfig reducedMotion>`) collapses the transition to `'no-animation'` and snaps the value.

`transition` also accepts a [named transition](../motion-config#named-transitions). Unlike the spring-only hooks, this hook honors the type of the registered config, whatever it is.

**`useAnimation` vs `useSpring`.** They overlap on the spring case. `useAnimation(target, { type: 'spring', ... })` and `useSpring(target, { ... })` make the same animation. Prefer `useSpring` when you only want spring physics. It also accepts a `SharedValue<number>` as the target, for smoothing that reacts on the UI thread (a gesture-driven source). `useAnimation` is the general-purpose hook. It accepts any `TransitionConfig`, including `timing`, `decay`, `no-animation`, and `repeat`, but only the JS thread drives it.

**`useAnimation` vs `Motion.View animate={{...}}`.** Use the `animate` prop when one Motion primitive owns the animated value from end to end. Use `useAnimation` when the same value drives several `useAnimatedStyle` blocks across siblings. In that case there is no Motion primitive to hold `animate`.

## `useAnimator()`

The **imperative** counterpart of `useAnimation`. `useAnimation` drives a value from an effect, and runs again when `target` changes. `useAnimator` returns a setter that you call from an event handler to move a value toward a target on demand. Use it when an event drives the write (a hover-in, a focus, a press), not rendered state.

```tsx
import { useAnimator, useMotionValue, Motion } from '@rootnative/inertia'

function HoverCard() {
  const hovered = useMotionValue(0)
  const animate = useAnimator()

  return (
    <Motion.Pressable
      onHoverIn={() => animate(hovered, 1, 'state-hover')}
      onHoverOut={() => animate(hovered, 0, 'state-hover')}
    />
  )
}
```

It exists because the hand-written escape hatch, `value.value = resolveTransition(config, to)` from an event handler, has two traps that `useAnimator` closes:

- **Named transitions resolve.** A [named transition](../motion-config#named-transitions) from the nearest `<MotionConfig transitions>` works here the same as on the `transition` prop or in `useAnimation`. A bare `resolveTransition` call can't reach the registry, because names resolve through context. So an imperative call site would otherwise rebuild a config that the provider already owns.
- **Reduced motion is respected.** The write goes through the same `'no-animation'` downgrade that `useAnimation` applies under `<MotionConfig reducedMotion>`. A hand-written `resolveTransition` write skips that accessibility setting with no warning. This hook fixes that correctness defect.

The returned callback has a **stable identity for the lifetime of the component**. It reads the registry and the reduced-motion flag from refs at call time. So neither a provider that publishes a new `transitions` map nor a reduced-motion change gives you a new function. Put it in a memoized handler or a `useCallback` dependency list, and nothing churns. The read at call time also means that a write always resolves against the registry _when the event fires_, not the one from render.

| Signature                                                                                                      | Returns    |
| -------------------------------------------------------------------------------------------------------------- | ---------- |
| `useAnimator()`                                                                                                | `Animator` |
| `Animator = (value: SharedValue<number>, to: number, transition?: TransitionConfig \| TransitionName) => void` | `void`     |

`transition` defaults to the library spring when you omit it. It accepts any `TransitionConfig` or a registered `TransitionName`, the same input as the declarative `transition` prop.

**`useAnimator` vs `useAnimation`.** The same transition vocabulary, the opposite trigger. `useAnimation(target, transition)` fires from an effect whenever `target` changes. `useAnimator()(value, to, transition)` fires exactly when you call it. Use `useAnimation` for a value that comes from state, and `useAnimator` for a write that an event drives.

This isn't a new animation API. It starts an animation in the existing transition vocabulary of Inertia, so it doesn't conflict with the scope rule "no imperative-only API that skips the declarative surface". It's the hooks-layer form of `useMotionValue` plus `resolveTransition`, without the traps.

## `useScroll()`

Tracks the scroll offset of a `Motion.ScrollView` or a `Motion.FlatList` as shared values. The scroll events fire on the UI thread, so any worklet can read the returned values with no JS-thread round trip.

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

| Field        | Type                                                       | Notes                                                                                                                          |
| ------------ | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `scrollX`    | `SharedValue<number>`                                      | Horizontal scroll offset in points.                                                                                            |
| `scrollY`    | `SharedValue<number>`                                      | Vertical scroll offset in points.                                                                                              |
| `maxScrollX` | `SharedValue<number>`                                      | The largest horizontal offset that the content can rest at. `Infinity` until the first scroll event. Read it, do not write it. |
| `maxScrollY` | `SharedValue<number>`                                      | The largest vertical offset that the content can rest at. `Infinity` until the first scroll event. Read it, do not write it.   |
| `onScroll`   | `(event: NativeSyntheticEvent<NativeScrollEvent>) => void` | Pass to the scrollable's `onScroll` prop. Worklet-backed; safe to forward to any Reanimated-animated scrollable.               |

`maxScrollX` and `maxScrollY` give the end of the content: the content length plus the end inset, minus the viewport length. An offset past the end is an overscroll. On iOS, a fling that reaches the end bounces past it and back, and the bounce back looks like a scroll up. Clamp the offset to the end to ignore the bounce:

```tsx
const { scrollY, maxScrollY, onScroll } = useScroll()
const restingY = useDerivedValue(() =>
  Math.min(scrollY.value, maxScrollY.value),
)
```

Each scroll event updates the end, so a change of the content size shows at the next scroll event. On iOS, the end leaves out the safe-area inset that `contentInsetAdjustmentBehavior="automatic"` adds, because the scroll event doesn't carry it. Keep the default `'never'` and add the inset as padding in `contentContainerStyle`.

Set `scrollEventThrottle={16}` on a `Motion.ScrollView` for steady 60 Hz updates. Without it, Android can send events less often than iOS. [`Motion.FlatList`](../primitives/flat-list) needs no such prop, because its default throttle is 1. Use `Motion.FlatList` when the list is so long that a mount of every row costs more than the animation.

## `useHideOnScroll(offset, { distance })`

Drives a shared value from 0 to 1 from the direction of a scroll. The value rises while the content scrolls down and falls while it scrolls up, one point of scroll for one point of `distance`. A bar that translates by its own height from this value exits as the user reads on, and returns at the moment they scroll back. That is the hide-on-scroll pattern of a bottom app bar or a floating button.

```tsx
import {
  useHideOnScroll,
  useInterpolatedStyle,
  useScroll,
  Motion,
} from '@rootnative/inertia'
import { Animated } from '@rootnative/inertia/reanimated'

const BAR_HEIGHT = 80

function Screen() {
  const { scrollY, onScroll } = useScroll()
  const hidden = useHideOnScroll(scrollY, { distance: BAR_HEIGHT })
  const barStyle = useInterpolatedStyle(hidden, { translateY: [0, BAR_HEIGHT] })

  return (
    <>
      <Motion.ScrollView onScroll={onScroll} scrollEventThrottle={16}>
        {/* …content… */}
      </Motion.ScrollView>
      <Animated.View style={[styles.bar, barStyle]} />
    </>
  )
}
```

Set `distance` to the height of the element that hides, so the element moves with the content.

The rules of the value:

- The value is 0 whenever the offset is at or above the top. So the element is in place at the top of the content, and after an overscroll bounce there.
- Movement past the end of the content doesn't count. On iOS, a fling that reaches the end bounces past it and back. The bounce back isn't a scroll up, so a hidden element stays hidden. `useScroll` records the end of the content for its own offsets. For an offset from somewhere else, pass the largest offset that the content can rest at as `maxOffset`, a shared value.
- On iOS, the end that `useScroll` records leaves out an inset that iOS adds by itself. The scroll event carries the `contentInset` that you set, but not the safe-area inset that `contentInsetAdjustmentBehavior="automatic"` adds. With that setting, the recorded end is short by the bottom safe-area inset (about 34 pt on an iPhone with a home indicator), and movement in that last stretch doesn't count. Keep the default `'never'` and add the inset as padding in `contentContainerStyle`, or pass `maxOffset`, which replaces the recorded end.
- The value accumulates and clamps. A long scroll down holds it at 1, and the first scroll up starts to bring it back, from anywhere in the content.
- The value runs on the UI thread, through a reaction on the offset, so any worklet can read it.
- The value doesn't snap to 0 or 1 when the scroll stops. An element can rest half hidden after a short scroll.
- A new `offset` or `maxOffset` starts the value again. The value returns to 0, and the next movement counts from the position of the new offset. A bar that follows the active list of a tab screen shows on each change of tab, and the rest of the switch doesn't count as a scroll.

## `useValueChange(value, onChange)`

Calls a JS-thread function when a shared value changes. The reaction runs on the UI thread and schedules `onChange(current, previous)` on the JS thread, once per change. It doesn't run for the initial value.

This is the bridge from the value layer back to React state: the index that a scroll offset selects, the page that a pager position crosses, the step that a drag passes. Derive the value on the UI thread first, so the JS thread hears one call per step and not one per frame.

```tsx
import { Motion, useScroll, useValueChange } from '@rootnative/inertia'
import { useDerivedValue } from '@rootnative/inertia/reanimated'

const PAGE_WIDTH = 320

function Pager({ onPageChange }: { onPageChange: (page: number) => void }) {
  const { scrollX, onScroll } = useScroll()
  const page = useDerivedValue(() => Math.round(scrollX.value / PAGE_WIDTH))
  useValueChange(page, onPageChange)

  return (
    <Motion.ScrollView
      horizontal
      pagingEnabled
      onScroll={onScroll}
      scrollEventThrottle={16}
    >
      {/* …pages… */}
    </Motion.ScrollView>
  )
}
```

The rules:

- `value` is a `SharedValue<T>` or a `DerivedValue<T>`. A change is a `!==` comparison of the new value with the last one, so derive a number, a string, or a boolean. A new object on every frame is a change on every frame.
- The callback can change on every render, as an inline arrow does. The hook always calls the latest one, and a new callback doesn't rebuild the UI-thread reaction.
- The call lands on the JS thread after the frame that changed the value. A change in the same frame as a render arrives after that render commits.
- Use it for state, not for style. A style that follows a value belongs in `useAnimatedStyle` or `useInterpolatedStyle`, on the UI thread.

## `useInView(ref, options?)`

Drives a shared value from 0 to 1 from whether an element is on screen. This is the missing **source** for the value layer. `useInterpolatedStyle`, `useShadow`, and `useColorCascade` all take a progress value and let you decide what drives it. `useInView` makes that driver "the user can see this element", so an entrance animation starts when the element arrives, not when the screen mounts.

```tsx
import { useInView, useInterpolatedStyle, Motion } from '@rootnative/inertia'
import { useRef } from 'react'
import type { ViewInstance } from 'react-native'

function RevealCard() {
  const ref = useRef<ViewInstance>(null)
  const inView = useInView(ref)
  const style = useInterpolatedStyle(inView, {
    opacity: [0, 1],
    translateY: [24, 0],
  })

  return <Motion.View ref={ref} style={style} />
}
```

Options:

| Option       | Type              | Default    | Notes                                                                                                                                            |
| ------------ | ----------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `amount`     | `number`          | `0`        | How much of the element must be visible, as a fraction of its own length. `0` fires on the first visible point, `1` waits for the whole element. |
| `once`       | `boolean`         | `true`     | Hold at `1` after the first sighting. Pass `false` to track visibility both ways.                                                                |
| `margin`     | `number`          | `0`        | Grow (positive) or shrink (negative) the detection box, in points. A positive margin fires before the element reaches the edge.                  |
| `transition` | `TransitionInput` | the spring | How the value moves between `0` and `1`. Takes a config or a registered `TransitionName`. Reduced motion snaps it.                               |

### What it needs to work

On **web**, the hook uses `IntersectionObserver`, so the ref is all that it needs.

On **native**, there is no such API, so the element must sit inside a [`Motion.ScrollView`](../primitives/scroll-view) or a [`Motion.FlatList`](../primitives/flat-list). Those publish their scroll offset and their visible length. The hook measures the element once and then does the arithmetic on the UI thread. The nesting depth doesn't matter. The measurement is in window coordinates, so an element at any depth reports correctly.

The hook reads the offset from the animated ref of the container, not from its `onScroll` prop. That prop stays free, so `useScroll` and `useInView` can drive the same container.

### Limits

- **Outside a scroll container on native, the value is `1` from the start**, and the hook warns once in development. An element on a fixed screen is visible, so the animation behaves exactly as it did before the hook existed. The hook doesn't replace a scroll container.
- **The hook measures the element on mount and when the width or height of the container changes (a rotate, a split view, a fold), not continuously.** Content that changes its height _above_ an element makes the trigger point of that element stale. Remount the element (change its `key`) if the layout above it moves.
- **The hook measures the element where it is drawn, with its transforms.** An entrance that starts the element 24 points lower (`translateY: [24, 0]` on the element that holds the ref) moves the trigger 24 points later, and a `scale` below `1` moves it a little more. For a small entrance this doesn't matter. To trigger on the layout box, put the ref on a plain wrapper and animate a child. On web, `IntersectionObserver` also uses the drawn box, so both platforms agree.

  ```tsx
  return (
    <View ref={ref}>
      <Motion.View style={style} />
    </View>
  )
  ```

- **An element longer than the container** can never satisfy a high `amount` literally, so the requirement caps at the length of the container. There, `amount: 1` means "fills the container", not "never".

## `useGesture(transition?)`

The hook form of the [`gesture` prop](../gestures). Use it when the gesture state of one Pressable must drive several animated views: a focus ring as a sibling, an MD3 state-layer halo over the content, a content tint and a separate icon-color animation. The prop form animates only the own style of the primitive. The hook gives you the progress shared values (0 to 1) to feed into any number of `useAnimatedStyle` blocks.

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

  // A real control: it has an onPress, so its tab stop is earned.
  return (
    <Pressable onPress={submit} {...handlers}>
      <Animated.View pointerEvents="none" style={ringStyle} />
      <Animated.View pointerEvents="none" style={haloStyle} />
    </Pressable>
  )
}
```

### Which set: `handlers` or `pointerHandlers`?

Pick by what the surface **is**, not by what you animate.

A `Pressable` is a keyboard tab stop even when it does nothing. Measured on react-native-web 0.21: a `Pressable` with no `onPress` renders `tabindex="0"`, and it still does with `accessible={false}` **and** `focusable={false}`. Neither prop removes it. Build a grid of five cards that lift on hover that way, and the page gains five keyboard stops that go nowhere. Nothing shows it: no warning, no failed test, and it looks correct in a browser. Only the built HTML shows it.

Every value in both sets is a plain `() => void`, so the behaviour needs no `Pressable`. Only the prop names do. A surface that only reacts to the pointer takes `pointerHandlers` on a `Motion.View` and adds no tab stop:

```tsx
function HoverLift({ children }) {
  const { hovered, pointerHandlers } = useGesture()
  const liftStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -6 * hovered.value }],
  }))

  return (
    <Animated.View style={liftStyle} {...pointerHandlers}>
      {children}
    </Animated.View>
  )
}
```

`onPointerEnter` and `onPointerLeave` are `ViewProps` since React Native 0.71, and react-native-web forwards them to the DOM. `onFocus` and `onBlur` are `ViewProps` too.

`pointerHandlers` has **no press pair** on purpose. A surface with press feedback must be a real control. Give it a `Pressable`, an `onPress`, and a role, and use `handlers`.

Returns:

| Field             | Type                        | Notes                                                                                                                                                                      |
| ----------------- | --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pressed`         | `SharedValue<number>`       | 0↔1 progress for the pressed layer.                                                                                                                                        |
| `focused`         | `SharedValue<number>`       | 0↔1 progress for any focus modality.                                                                                                                                       |
| `focusVisible`    | `SharedValue<number>`       | 0↔1 progress for a focus that shows a ring (W3C `:focus-visible`; on web the browser decides, see [Gestures](../gestures.md#focusvisible-follows-the-browser-on-web)).     |
| `hovered`         | `SharedValue<number>`       | 0↔1 progress for hover (web only — stays at 0 on native).                                                                                                                  |
| `handlers`        | `UseGestureHandlers`        | `{ onPressIn, onPressOut, onHoverIn, onHoverOut, onFocus, onBlur }`. Spread on a `Pressable` that is a real control. If you call `onFocus` yourself, pass the focus event. |
| `pointerHandlers` | `UseGesturePointerHandlers` | `{ onPointerEnter, onPointerLeave, onFocus, onBlur }`. The same callbacks by reference, keyed for a plain `View`. No press pair.                                           |

The transitions have the same shape as the `transition` that goes with the `gesture` prop:

- `useGesture({ type: 'timing', duration: 150 })`: the same config for every layer.
- `useGesture({ pressed: {...}, hovered: {...}, focused: {...}, focusVisible: {...} })`: one config per layer.
- Both positions accept a [named transition](../motion-config#named-transitions): `useGesture('state-press')` or `useGesture({ pressed: 'state-press' })`.
- A layer with no explicit transition falls back to the library default spring.
- The hook respects `<MotionConfig reducedMotion>`. When reduced motion is active, every transition collapses to `'no-animation'`, and the progress snaps instead of interpolating.

The shared values and the handler set keep their **identity** across renders, so you can pass them to memoized children. To compose with your own handlers (for example, an `onPressIn` for analytics), wrap them by hand:

```tsx
<Pressable
  {...handlers}
  onPressIn={(e) => {
    track('press')
    handlers.onPressIn()
  }}
/>
```

When `useGesture` and the `gesture` prop describe the same case, prefer the prop. It has fewer parts. The hook is the escape hatch for a composition that the prop can't express.

## `useGestureLayer(states, options?)`

A higher-level helper over `useGesture` for the composition model where **the strongest active layer wins**, as in an MD3 state-layer halo or an iOS translucent overlay. You supply a target map per state. The hook owns the four gesture progress shared values, the `disabled` override, the worklet, and the transition. It also returns those progress shared values as `states`, so a style from the same gesture wiring (an elevation crossfade, an icon tint) needs no second `useGesture` call. It lives at the `@rootnative/inertia/gesture-layer` subpath, so an app that doesn't need it doesn't pay for it.

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

- **Numeric keys** (`opacity`, `scale`, `borderWidth`, …) compose with clamped-max, with `rest` as the floor: `out = max(rest, …for each active layer: lerp(rest, layer, progress))`. Several active states raise the value to the strongest layer, not to the sum. This is the MD3 halo pattern.
- **Color keys** (any string value) compose with the priority cascade through `interpolateColor`, lowest priority first: `hovered → focused → focusVisible → pressed`. Clamped-max doesn't apply to a color. This matches the cascade of the declarative `gesture` prop.
- **Disabled** sits at the top of the cascade for both numeric and color keys. When active, it lerps the composed value toward the `disabled` target. The `disabled` flag comes from JS, not from a gesture.

### States

| Key            | Notes                                                                                                                                                                                              |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `rest`         | Base values, applied when no other layer is active. Missing keys default to `0` (numeric) / `'transparent'` (color).                                                                               |
| `hovered`      | Web-only hover. No-op on native.                                                                                                                                                                   |
| `focused`      | Any focus modality (mouse, touch, keyboard).                                                                                                                                                       |
| `focusVisible` | A focus that shows a ring (W3C `:focus-visible`; on web the browser decides, see [Gestures](../gestures.md#focusvisible-follows-the-browser-on-web)). On native, behaves identically to `focused`. |
| `pressed`      | Active touch / pointer-down.                                                                                                                                                                       |
| `disabled`     | Gated by `options.disabled`. Overrides every gesture layer when active; per-layer transitions don't apply (top-level transition or default spring).                                                |

Every state key is optional. The value of each state is a flat map from style keys to a number (a numeric layer) or a string (a color layer). The hook doesn't check that a string value is a valid color. `borderStyle: 'solid'` crashes inside the worklet. Use only color strings as string values.

### Options

| Field        | Type                                                            | Notes                                                                                                                                                                                                                                                                                                                     |
| ------------ | --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `disabled`   | `boolean`                                                       | Activates the `disabled` layer (or `rest` if `disabled` is undefined).                                                                                                                                                                                                                                                    |
| `transition` | `TransitionConfig \| TransitionName \| GestureLayerTransitions` | Forwarded to the underlying `useGesture`. Either one config for every gesture layer, or per-layer (`{ pressed, focused, focusVisible, hovered }`). Reduced motion collapses every transition to `'no-animation'`. Per-layer transitions don't apply to `disabled` — it uses the top-level config (or the default spring). |

### Returns

| Field      | Type                   | Notes                                                                                                                                                                                                 |
| ---------- | ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `style`    | Animated style         | Spread onto an `Animated.View` or a `Motion.*`'s `style`.                                                                                                                                             |
| `handlers` | `UseGestureHandlers`   | `{ onPressIn, onPressOut, onHoverIn, onHoverOut, onFocus, onBlur }`. Spread on the host `Pressable`.                                                                                                  |
| `states`   | `GestureLayerProgress` | The per-state 0↔1 progress shared values the style is derived from: `{ hovered, focused, focusVisible, pressed, disabled }`. Stable across renders; treat as read-only — the handlers own the writes. |

`states` exists so that a component that already wires its state layer through `useGestureLayer` can derive _more_ styles from the same gesture progress, without a parallel `useGesture` call. The canonical case is an elevation crossfade on hover:

```tsx
import { useGestureLayer } from '@rootnative/inertia/gesture-layer'
import { useShadow } from '@rootnative/inertia'

const { style, handlers, states } = useGestureLayer(layerStates, { disabled })
// Feed the raw hover progress straight into another progress-driven hook:
const shadow = useShadow({
  from: restShadow,
  to: raisedShadow,
  progress: states.hovered,
})
// <Animated.View style={[style, shadow]} />
```

The gesture entries (`hovered`, `focused`, `focusVisible`, `pressed`) are the same shared values that `useGesture` returns. `disabled` is the own progress (0 to 1) of the hook for the `options.disabled` override. Each of them also works in a custom `useAnimatedStyle` or `useDerivedValue`, for a derivation that the composed style can't express.

**`useGestureLayer` vs the declarative `gesture` prop.** The prop composites states as a fixed **priority cascade** (`hovered → focused → focusVisible → pressed`). When two layers are fully active, the value converges to the target of the higher-priority layer, whichever is numerically stronger. `useGestureLayer` composites numbers with **clamped-max**. A press while hovered shows the _stronger_ target per key, whatever its priority. The MD3 and iOS translucent halo wants clamped-max, so that a weaker press target can't "dim" an active hover layer. Use the prop for ordinary button feedback (`{ scale: 0.96 }` on press over an opacity hover). Use this hook when the targets are state-layer overlays whose strongest value must win.

**`useGestureLayer` vs `useGesture` with a custom worklet.** `useGesture` returns the raw progress shared values (0 to 1). Use it for a composition that this hook doesn't express: an additive blend, a custom rule per key, several outputs (for example, a halo plus a separate ring with different math). `useGestureLayer` is the convenience layer for the one composition model that it owns.

## `useVariants(variants, initial?)`

Builds a controller for a variants map. Pass it through `controller={...}` to drive transitions imperatively.

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

The controller keeps its identity. The hook returns the same object across renders. It also pins the `variants` map from the first render. If a later render passes a different map object, the controller still checks keys against the first one. Define the map once (at module scope or in `useMemo`), not inline in render.

Don't set `controller` and `animate` on the same primitive. The controller drives the animation, and the primitive ignores `animate` (with a warning in dev).

See [Variants](../variants) for the props-side usage.

## `useMotionConfig()`

Reads the active `<MotionConfig>` value:

```ts
import { useMotionConfig } from '@rootnative/inertia'

const { reducedMotion, transitions } = useMotionConfig()
// reducedMotion: 'user' | 'never' | 'always'
// transitions: the merged named-transition registry from ancestor providers
```

It returns the default (`{ reducedMotion: 'user', transitions: {} }`) when the tree has no provider.

## `useShouldReduceMotion()`

Resolves the active reduced-motion mode to a boolean. `'user'` asks the OS-backed hook of Reanimated. `'never'` returns `false`, and `'always'` returns `true`.

```ts
import { useShouldReduceMotion } from '@rootnative/inertia'

function MyVideoIntro() {
  const reduce = useShouldReduceMotion()
  if (reduce) return <StaticPoster />
  return <AnimatedIntro />
}
```

Every Motion primitive uses this hook to decide whether to swap transitions for `'no-animation'`. It subscribes to OS changes, so a component re-renders when the user changes the setting at runtime.

## `usePresence()`

Reads the per-child presence context inside a custom component that must behave like a Motion primitive under `<Presence>`:

```ts
import { usePresence } from '@rootnative/inertia'

function CustomExitable() {
  const presence = usePresence()
  // presence is null when no <Presence> ancestor exists
  // presence?.isPresent flips false when the parent removes us
  // presence?.safeToRemove() — call once exit completes
}
```

A call to `usePresence()` also tells `<Presence>` that the child has a consumer. The child then stays mounted after it departs, until `safeToRemove()` runs or until every `Motion.*` under it finishes its exit. `Presence` removes a departing child with no consumer and no `Motion.*` at once. A component that reads only `isPresent`, and never calls `safeToRemove()`, doesn't hold a child that has a `Motion.*` inside it.

See [Presence](../presence) for the higher-level prop-driven usage.

## `buildReleaseAnimation(transition, toValue, callback?)`

A worklet-safe builder for a single-step animation. It mirrors a subset of [`resolveTransition`](./transition-utilities.md#resolvetransitionconfig-tovalue-callback) for the UI-thread path, where you pick the transition config at gesture release, not at render. It supports `spring`, `timing`, `decay`, and `no-animation`. It doesn't support a sequence, a top-level `repeat`, or the automatic worklet wrap of an easing function.

```ts
import { buildReleaseAnimation } from '@rootnative/inertia'
import { usePanGesture } from 'react-native-gesture-handler'

const pan = usePanGesture({
  onDeactivate: (e) => {
    'worklet'
    // Spring to a snap target with the release velocity preserved.
    position.value = buildReleaseAnimation(
      { type: 'spring', velocity: e.velocityX, friction: 26, tension: 170 },
      snapTarget,
    ) as number
  },
})
```

A decay transition ignores the second argument. A decay slows down from the current position of the shared value with its own physics.

`callback`, when you pass one, fires once when the animation settles. It has the same `(finished) => void` shape that the `with*` factories of Reanimated accept. It runs on the UI thread. Bridge to JS-thread code with `runOnJS(...)` inside it. For `no-animation`, it fires synchronously with `finished: true`, because a direct assignment has no settle point of its own. The `onSwipeEnd` of `useSwipe` uses this callback.

| Signature                                                                                            | Returns                                                                  |
| ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| `buildReleaseAnimation(transition: TransitionConfig, toValue: number, callback?: AnimationCallback)` | Reanimated animation value (assign to a `SharedValue<number>` directly). |

Most apps use `useDrag({ onRelease })` from `@rootnative/inertia-gestures` instead. It wraps this builder behind a return shape per axis. Use `buildReleaseAnimation` directly when you write a custom `onDeactivate` worklet for a Gesture Handler hook outside the adapter hooks.

## `useTranslateStyle(x, y)`

An animated style that translates by two shared values: `transform: [{ translateX: x }, { translateY: y }]`. This is the `animatedStyle` that every drag hook returns (`useTouchDrag`, and `useDrag`, `usePan`, and `useSwipe` in `@rootnative/inertia-gestures`). Use it directly when a custom gesture owns its own translation values.

```tsx
import { Motion, useMotionValue, useTranslateStyle } from '@rootnative/inertia'

function Puck() {
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const style = useTranslateStyle(x, y)
  return <Motion.View style={[styles.puck, style]} />
}
```

| Signature                                                           | Returns          |
| ------------------------------------------------------------------- | ---------------- |
| `useTranslateStyle(x: SharedValue<number>, y: SharedValue<number>)` | `TranslateStyle` |

`TranslateStyle`, `ColorStyle` (from `useColorTransition` and `useColorCascade`), and `ShadowStyle` (from `useShadow`) are **plain style objects**, not the branded `AnimatedStyleHandle` of Reanimated. Reanimated 4.5 brands what `useAnimatedStyle` returns, and a `StyleProp` array rejects a branded value. So these hooks state the plain shape instead, and a style-array call site needs no cast. The brand exists at compile time only. The value is still the animated style that Reanimated made.

The style owns the whole `transform` key. Don't put a second transform style next to it. `transform` is one key in React Native, so the later style replaces this one and doesn't merge. To add a transform, nest another animated view, or build one style from `x` and `y` with `useInterpolatedStyle`.

## `applyBounds(value, min, max, elastic)`

Clamps `value` to `[min, max]`. When `elastic > 0`, the function scales the overshoot past a bound by `elastic` instead of a hard clamp. That gives an elastic feel. `min` and `max` can be `undefined`, which leaves that side open. It's a worklet, so it runs inside a gesture-handler pan handler on the UI thread, and also from a JS-thread `PanResponder` callback. `useTouchDrag` and `useDrag` apply their `constraints` and `elastic` options through it.

```ts
import { applyBounds } from '@rootnative/inertia'

applyBounds(120, -100, 100, 0) // 100
applyBounds(120, -100, 100, 0.5) // 110
applyBounds(50, undefined, 100, 0) // 50
```

| Signature                                                                                         | Returns  |
| ------------------------------------------------------------------------------------------------- | -------- |
| `applyBounds(value: number, min: number \| undefined, max: number \| undefined, elastic: number)` | `number` |

## `useTouchDrag(options?)`

A drag hook on PanResponder. It's the counterpart of `useDrag` from `@rootnative/inertia-gestures`, with no extra peer dependency. Both share the same `onRelease` shape. `useTouchDrag` lives in core (`@rootnative/inertia/touch`) and returns `panHandlers` to spread on a `View`, instead of a `gesture` object for `<GestureDetector>`. Don't spread them on a `Pressable`. `Pressable` spreads its own responder handlers after yours, and they replace the pan handlers, so the drag doesn't move.

```tsx
import { Motion } from '@rootnative/inertia'
import { useTouchDrag } from '@rootnative/inertia/touch'
import { View } from 'react-native'

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
    <View
      accessibilityRole="adjustable"
      focusable
      onKeyDown={handleKey} // arrow keys, where the platform sends key events
      {...drag.panHandlers}
    >
      <Motion.View style={[styles.thumb, drag.animatedStyle]} />
    </View>
  )
}
```

| Option        | Type                                           | Default  | Notes                                                                                                           |
| ------------- | ---------------------------------------------- | -------- | --------------------------------------------------------------------------------------------------------------- |
| `axis`        | `'x' \| 'y' \| 'both'`                         | `'both'` | Lock the gesture to one axis.                                                                                   |
| `constraints` | `{ left?, right?, top?, bottom? }`             | none     | Bounds in px from the resting position. Each side independently optional.                                       |
| `elastic`     | `number` (0–1)                                 | `0`      | Rubber-band coefficient past `constraints`. `0` hard-clamps. An overshoot springs back to the bound on release. |
| `onDragStart` | `() => void`                                   | none     | Fires on JS thread when drag begins.                                                                            |
| `onDragEnd`   | `(info: { x, y, velocity: { x, y } }) => void` | none     | Fires on JS thread when drag ends. Velocity normalized to px/sec.                                               |
| `onRelease`   | `(info) => ReleaseResult \| void`              | none     | JS-thread release transition. Same shape as the gesture-handler `useDrag`'s `onRelease`.                        |

The hook returns `{ panHandlers, animatedStyle, dragX, dragY, isDragging }`.

**When the bounds change.** A new `constraints` value applies from the next drag. An element at rest outside the new bounds stays there, and it jumps at the first move of the next drag. To move it at once, write `dragX` or `dragY` when you change the bounds. For example, after a rotate changes the width of a slider track, set the thumb to the same fraction of the new track.

**When to pick `useTouchDrag` over `useDrag` from `@rootnative/inertia-gestures`:** you want key steps on the dragged element (arrow keys, `PageUp`, `PageDown`; see **Keyboard** below for the platforms), or you don't want `react-native-gesture-handler` as a peer dependency. **When to skip it:** you already use `react-native-gesture-handler` elsewhere. The release velocity of the gesture-handler `useDrag` comes from the UI thread and is a little more precise. Consistency across the app matters more than a small gain per call.

**Keyboard.** `useTouchDrag` composes with `onKeyDown`, but the key events come from the platform. `onKeyDown` fires on web. On Android, React Native sends key events only when the app turns on the `enableKeyEvents` feature flag in its native code, and Expo Go leaves it off. iOS sends no key events. For a screen reader on iOS and Android, give the element `accessibilityActions` with `increment` and `decrement`, and step the value in `onAccessibilityAction`.
