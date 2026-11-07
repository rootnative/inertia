---
sidebar_position: 1
description: Every animatable surface is a Motion.* component — an animatable mirror of a React Native primitive, with its prop surface unchanged.
---

# Primitives

Every animatable surface is a `Motion.*` component. Each one is an animatable mirror of a React Native primitive. The props stay the same, except `style`, plus the Motion props: `initial`, `animate`, `exit`, `variants`, `controller`, `gesture`, `transition`, `onAnimationEnd`, `layout`, and `layoutId`.

| Component                            | Wraps RN's   | Style type   |
| ------------------------------------ | ------------ | ------------ |
| [`Motion.View`](./view)              | `View`       | `ViewStyle`  |
| [`Motion.Text`](./text)              | `Text`       | `TextStyle`  |
| [`Motion.Image`](./image)            | `Image`      | `ImageStyle` |
| [`Motion.Pressable`](./pressable)    | `Pressable`  | `ViewStyle`  |
| [`Motion.ScrollView`](./scroll-view) | `ScrollView` | `ViewStyle`  |
| [`Motion.FlatList`](./flat-list)     | `FlatList`   | `ViewStyle`  |

## Per-primitive style inference

`animate`, `initial`, `exit`, and the `gesture` sub-states take the type of the `style` prop of the component. There is no shared `ViewStyle & TextStyle & ImageStyle` fallback. So `tintColor` autocompletes on `Motion.Image`, and `Motion.View` rejects it at compile time.

```tsx
<Motion.Image animate={{ tintColor: '#4f46e5' }} />     // ✅
<Motion.View animate={{ tintColor: '#4f46e5' }} />      // ❌ TS error
```

## Custom primitives

Wrap any component with `createMotionComponent(C)` to get the same prop surface, inferred from the style prop of `C`. See [createMotionComponent](../api/create-motion-component).

## Plain host (zero-cost pass-through)

A `Motion.*` primitive with **none** of the animation props (`initial`, `animate`, `exit`, `transition`, `variants`, `controller`, `gesture`, `layout`, `layoutId`, `onAnimationEnd`) is a zero-cost pass-through over `Animated.createAnimatedComponent(Component)`. It allocates no shared values, mounts no `useAnimatedStyle` worklet, holds no gesture state, and does no animation work per render. It forwards `style`, `ref`, and every other prop straight to the host. A guard test pins this: a `Motion.View` with no props calls neither `useSharedValue` nor `useAnimatedStyle`.

So you never need `Animated.View` from the [`/reanimated` interop subpath](../api/reanimated-interop) only to render an animated-style **fragment** from a value-layer hook. Use the primitive directly:

```tsx
import { Motion, useColorTransition } from '@rootnative/inertia'

function Fill({ progress }) {
  const fill = useColorTransition(progress, ['#ffffff', '#4f46e5'])
  // Prop-less Motion.View — a plain animated host for the fragment. No
  // Reanimated import needed.
  return <Motion.View style={[styles.box, fill]} />
}
```

When you add an animation prop, the same instance opts into the full animated body. It remounts across that boundary, so give an element that switches between plain and animated a stable `key` if the remount matters. There is one host concept, and no separate "plain" alias to pick.

## Animatable properties

Inertia supports the properties below on every primitive that accepts them. `animate` is typed per primitive **and** narrowed to this set. A style key that Inertia doesn't drive is a compile error, not a silent no-op. So a typo or an unsupported property fails the build instead of doing nothing at runtime.

**Numeric:** `opacity`, `translateX`, `translateY`, `scale`, `scaleX`, `scaleY`, `rotate`, `rotateX`, `rotateY`, `width`, `height`, `borderRadius`, `shadowOpacity`, `shadowRadius`, `elevation`. A rotation value is degrees as a number. The runtime adds `'deg'` before it passes the value to Reanimated.

**Layout numerics** (since `0.0.5`):

| Group             | Keys                                                                                                            |
| ----------------- | --------------------------------------------------------------------------------------------------------------- |
| Per-corner radius | `borderTopLeftRadius`, `borderTopRightRadius`, `borderBottomLeftRadius`, `borderBottomRightRadius`              |
| Border width      | `borderWidth`, `borderTopWidth`, `borderRightWidth`, `borderBottomWidth`, `borderLeftWidth`                     |
| Absolute inset    | `top`, `right`, `bottom`, `left`                                                                                |
| Padding           | `padding`, `paddingTop`, `paddingRight`, `paddingBottom`, `paddingLeft`, `paddingHorizontal`, `paddingVertical` |
| Margin            | `margin`, `marginTop`, `marginRight`, `marginBottom`, `marginLeft`, `marginHorizontal`, `marginVertical`        |
| Flex sizing       | `flex`, `flexGrow`, `flexShrink`                                                                                |
| Gap               | `gap`, `rowGap`, `columnGap`                                                                                    |
| Stacking          | `zIndex`                                                                                                        |
| Text metrics      | `fontSize`, `letterSpacing`, `lineHeight` — `Motion.Text` only, since they live on `TextStyle`                  |

These keys animate the box itself, not a transform, so they trigger layout on each frame. Prefer `scale` and `translateX` for pure motion. They run on the compositor and don't reflow. Use the layout keys when the effect _is_ a layout change: a drawer that slides with `left`, a card that squares one corner as it expands, a pane that resizes with `flex`.

**Not animatable, on purpose:** an enum key (`position`, `overflow`, `alignItems`, `flexDirection`, `display`) has nothing to interpolate between. `minWidth`, `maxWidth`, `minHeight`, `maxHeight`, and `aspectRatio` are excluded for a subtler reason. Their unset state isn't a number. So there is no value for the key to rest at when only a `gesture` sub-state or an inactive variant declares it, without a layout change the moment it activates. Animate `width` or `height` instead, or use the [value-layer hooks](../api/hooks).

**Shadow offset:** `shadowOffset` accepts the nested `{ width, height }` object, in the single-value form only. See [Motion.View](./view) for the contract.

**Box shadow:** `boxShadow` animates the cross-platform CSS shadow form. See [Motion.View](./view#boxshadow) for the layer-count rules and the `inset` constraint. Don't animate it next to the native `shadow*` keys on the same element. That applies two shadow systems at once, and Inertia warns in dev when it sees both.

**Color:** `backgroundColor`, `borderColor`, `color`, `shadowColor`, `tintColor` (Image only). Any color string that Reanimated knows works: hex (`'#4f46e5'`, `'#fff'`), `rgb()` and `rgba()`, `hsl()` and `hsla()`, and named colors, including `'transparent'`. Inertia forwards the target straight through `withSpring` or `withTiming`. The value setter of Reanimated packs the string to RGBA and interpolates on the UI thread.

```tsx
<Motion.View
  initial={{ backgroundColor: 'transparent' }}
  animate={{ backgroundColor: '#4f46e5' }}
  transition={{ type: 'timing', duration: 200 }}
/>
```

When you omit `initial`, a color slot seeds with `'transparent'`. That is fine for a fade-in. When you animate between two opaque values, pass an explicit `initial` color, so the first frame doesn't flash through transparent.

**Optional adapter primitives:** gradient interpolation ships in [`@rootnative/inertia-gradients`](../gradients) (`MotionLinearGradient`), and SVG path morphing ships in [`@rootnative/inertia-svg`](../svg) (`MotionPath`). Both take the same `initial`, `animate`, and `transition` shape.

**Layout transitions:** the [`layout` prop](../layout) animates a change of position or size that comes from outside the `animate` flow, such as a reorder of siblings or a change of dimensions.

**Shared element transitions:** the [`layoutId` prop](../layout#shared-element-transitions-layoutid) runs a FLIP between two `Motion.*` primitives that mount with the same id, across a mount or a screen, with no animation config beyond the shared id.
