---
sidebar_position: 1
---

# Primitives

Every animatable surface is a `Motion.*` component. Each one is an animatable mirror of an underlying React Native primitive — the prop surface (other than `style`) is unchanged, plus the Motion-specific props (`initial`, `animate`, `exit`, `variants`, `controller`, `gesture`, `transition`, `onAnimationEnd`).

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

## Animatable properties (alpha)

The Phase-1 alpha supports the numeric properties below across every primitive that accepts them. Color and layout interpolation land in v0.1's later phases.

`opacity`, `translateX`, `translateY`, `scale`, `scaleX`, `scaleY`, `rotate`, `width`, `height`, `borderRadius`.
