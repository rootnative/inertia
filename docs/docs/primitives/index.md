---
sidebar_position: 1
---

# Primitives

Every animatable surface is a `Motion.*` component. Each one is an animatable mirror of an underlying React Native primitive — the prop surface (other than `style`) is unchanged, plus the Motion-specific props (`initial`, `animate`, `exit`, `variants`, `controller`, `gesture`, `transition`, `onAnimationEnd`, `layout`, `layoutId`).

| Component                            | Wraps RN's   | Style type   |
| ------------------------------------ | ------------ | ------------ |
| [`Motion.View`](./view)              | `View`       | `ViewStyle`  |
| [`Motion.Text`](./text)              | `Text`       | `TextStyle`  |
| [`Motion.Image`](./image)            | `Image`      | `ImageStyle` |
| [`Motion.Pressable`](./pressable)    | `Pressable`  | `ViewStyle`  |
| [`Motion.ScrollView`](./scroll-view) | `ScrollView` | `ViewStyle`  |

## Per-primitive style inference

`animate`, `initial`, `exit`, and `gesture` sub-states are typed against the underlying component's `style` shape — there is no shared `ViewStyle & TextStyle & ImageStyle` fallback. So `tintColor` autocompletes on `Motion.Image` and is rejected at compile time on `Motion.View`.

```tsx
<Motion.Image animate={{ tintColor: '#4f46e5' }} />     // ✅
<Motion.View animate={{ tintColor: '#4f46e5' }} />      // ❌ TS error
```

## Custom primitives

Wrap any component with `createMotionComponent(C)` to get the same prop surface inferred from `C`'s style prop. See [createMotionComponent](../api/create-motion-component).

## Plain host (zero-cost pass-through)

A `Motion.*` primitive with **none** of the animation-driving props — `initial`, `animate`, `exit`, `transition`, `variants`, `controller`, `gesture`, `layout`, `layoutId`, `onAnimationEnd` — is a zero-cost pass-through over `Animated.createAnimatedComponent(Component)`. It allocates no shared values, mounts no `useAnimatedStyle` worklet, holds no gesture state, and does no per-render animation work: it forwards `style`, `ref`, and every other prop straight to the underlying host. (A guard test pins this — a prop-less `Motion.View` calls neither `useSharedValue` nor `useAnimatedStyle`.)

This means you never need to reach for `Animated.View` from the [`/reanimated` interop subpath](../api/reanimated-interop) just to render an animated-style **fragment** from a value-layer hook. Use the primitive directly:

```tsx
import { Motion, useColorTransition } from '@rootnative/inertia'

function Fill({ progress }) {
  const fill = useColorTransition(progress, ['#ffffff', '#4f46e5'])
  // Prop-less Motion.View — a plain animated host for the fragment. No
  // Reanimated import needed.
  return <Motion.View style={[styles.box, fill]} />
}
```

The instant you add an animation prop, the same instance opts into the full animated body (it re-mounts across that boundary, so give an element that flips between plain and animated a stable `key` if the remount matters). One host concept, no separate "plain" alias to pick between.

## Animatable properties (alpha)

The alpha supports the properties below across every primitive that accepts them.

**Numeric:** `opacity`, `translateX`, `translateY`, `scale`, `scaleX`, `scaleY`, `rotate`, `rotateX`, `rotateY`, `width`, `height`, `borderRadius`, `shadowOpacity`, `shadowRadius`, `elevation`. Rotation values are degrees as numbers — the runtime wraps with `'deg'` before handing to Reanimated.

**Shadow offset:** `shadowOffset` accepts the nested `{ width, height }` object (single-value form only — see [Motion.View](./view) for the contract).

**Color:** `backgroundColor`, `borderColor`, `color`, `shadowColor`, `tintColor` (Image only). Any color string Reanimated recognizes works — hex (`'#4f46e5'`, `'#fff'`), `rgb()` / `rgba()`, `hsl()` / `hsla()`, and named colors including `'transparent'`. The target is forwarded straight through `withSpring` / `withTiming`; Reanimated's value setter packs the string to RGBA and interpolates on the UI thread.

```tsx
<Motion.View
  initial={{ backgroundColor: 'transparent' }}
  animate={{ backgroundColor: '#4f46e5' }}
  transition={{ type: 'timing', duration: 200 }}
/>
```

When `initial` is omitted, color slots seed with `'transparent'` — fine for fade-in, but pass an explicit `initial` color when animating between two opaque values to avoid the first frame flashing through transparent.

**Optional adapter primitives:** gradient interpolation ships in [`@rootnative/inertia-gradients`](../gradients) (`MotionLinearGradient`), and SVG path morphing ships in [`@rootnative/inertia-svg`](../svg) (`MotionPath`). Both compose with the same `initial` / `animate` / `transition` shape.

**Auto-layout transitions:** the [`layout` prop](../layout) animates position + size changes that come from outside the `animate` flow — siblings reordering, dimensions toggling, etc.

**Shared element transitions:** the [`layoutId` prop](../layout#shared-element-transitions-layoutid) FLIPs between two `Motion.*` primitives that mount with the same id — cross-mount or cross-screen, without any explicit animation config beyond the shared id.
