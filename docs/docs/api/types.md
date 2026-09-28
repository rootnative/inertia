---
sidebar_position: 5
description: Every type that the root entry exports, what each one describes, and where it is used.
---

# Types

The root entry exports each type below. Import a type with `import type`, so that it adds nothing to the bundle:

```ts
import type { MotionProps, RepeatConfig } from '@rootnative/inertia'
```

The primitive subpaths (`@rootnative/inertia/view`, `/text`, …) export only the component. Import the types on this page from the root.

Many types take the component type as a parameter. `C` is the props of the underlying component, for example `ComponentProps<typeof View>`. `S` is an animate style, which is `AnimateStyle<C>` in most cases.

## Component props

Use these types to type a wrapper around a Motion primitive, or a prop that you pass through to one.

### `MotionProps<C, V>`

The animation props that every Motion primitive adds to the props of its component: `initial`, `animate`, `exit`, `variants`, `controller`, `gesture`, `transition`, `layout`, `layoutId`, `onAnimationEnd`.

`V` is the variants map. TypeScript infers it from the `variants` prop at each call site, so `animate` accepts only the variant keys. With no `variants` prop, `V` is `VariantsMap<C>`, and `animate` accepts any string.

```tsx
import type { ComponentProps } from 'react'
import type { View } from 'react-native'
import { Motion, type MotionProps } from '@rootnative/inertia'

type FadeProps = Pick<MotionProps<ComponentProps<typeof View>>, 'transition'>

function Fade({ transition }: FadeProps) {
  return (
    <Motion.View
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={transition}
    />
  )
}
```

### `MotionComponentProps<C, V>`

All the props of a Motion primitive: the props of `C` without `style`, plus `MotionProps`, plus an animated `style` and a `ref`. Here `C` is the component type, not its props. This is the props type of the components that [`createMotionComponent`](./create-motion-component.md) makes.

```ts
import type { View } from 'react-native'
import type { MotionComponentProps } from '@rootnative/inertia'

type CardProps = MotionComponentProps<typeof View> & { title: string }
```

`style` comes from Reanimated's `AnimatedProps`, so a style from `useAnimatedStyle` goes into it with no cast.

### `AnimateStyle<C>`

The value of `initial`, `animate`, `exit`, and each `gesture` sub-state. It contains only the style keys that Inertia animates and that the style prop of `C` has. Any other key is a compile error, for example `aspectRatio`, which Inertia does not animate, or `fontSize` on `Motion.View`, whose style has no `fontSize`. Each value can be a target, a step, or a sequence of steps (`AnimatableValue`). Two keys are different:

- `boxShadow` takes a `BoxShadowInput` and does not accept a sequence.
- `transform` takes the array that the style prop of `C` declares.

See [Animatable properties](../primitives/index.md#animatable-properties) for the key list.

### `VariantsMap<C>`

`Record<string, AnimateStyle<C>>`. The type of the `variants` prop: state names to animate targets. See [Variants](../variants.md).

### `VariantController<K>`

The value that [`useVariants`](./hooks.md#usevariantsvariants-initial) returns, and the type of the `controller` prop. `K` is the union of the variant names.

```ts
interface VariantController<K extends string = string> {
  current: K
  transitionTo(next: K): void
}
```

The interface has one more member, `subscribe`. It is internal. Do not call it.

### `GestureSubStates<C>`

The value of the `gesture` prop: an `AnimateStyle<C>` for each of `pressed`, `focused`, `focusVisible`, and `hovered`. All four are optional. See [Gestures](../gestures.md) for the priority order.

### `AnimationCallbackInfo<S>`

The argument of `onAnimationEnd`.

```ts
interface AnimationCallbackInfo<S> {
  key: keyof S | 'transform'
  finished: boolean
  value: unknown
  target: unknown
  phase: 'step' | 'sequence' | 'repeat' | 'animation'
  step: number | undefined
  iteration: number
}
```

For the terminal `'animation'` phase of a transform key, `key` is `'transform'`, not the axis. See [`onAnimationEnd`](../sequences.md#onanimationend) for when each phase fires.

### `BoxShadowInput`

`string | ReadonlyArray<BoxShadowValue>`. The `boxShadow` value on `animate`: a CSS `box-shadow` string, or the React Native array of layers. The two ends of an animation can have a different number of layers. A layer that is `inset` at one end and not at the other end throws.

## Transitions

These types describe the `transition` prop and the values that animate.

### `SequenceStep<V>`

One step of a sequence: a target value, or an object with the target in `to`, an optional `delay`, and a transition for that step only.

```ts
import type { SequenceStep } from '@rootnative/inertia'

const steps: SequenceStep<number>[] = [
  0,
  { to: 1.2, type: 'timing', duration: 120 },
  { to: 1, delay: 40 },
]
```

See [Sequences and repeat](../sequences.md).

### `RepeatConfig`

The value of `repeat` on a spring or timing transition.

```ts
type RepeatConfig =
  | number
  | 'infinite'
  | { count: number | 'infinite'; alternate?: boolean }
```

`count` is the total number of passes, including the first pass. A count less than `1` plays the animation one time and warns in development. `alternate` is `true` by default. It has no effect on a sequence. See [Repeat](../sequences.md#repeat).

### `PerPropertyTransition<S>`

A map from animate keys to a `TransitionInput`. It is the per-property form of the `transition` prop. A per-property entry overrides the top-level transition for that key. See [Top-level vs per-property](../transitions.md#top-level-vs-per-property).

### `EasingInput`

`EasingFunction | EasingFunctionFactory`. The value of `easing` on a timing transition: a plain `(t) => number` function, or the factory object that Reanimated 4 builders such as `Easing.bezier(...)` return. Inertia unwraps the factory. See [Easing input shape](../transitions.md#easing-input-shape).

### `NamedTransitions`

`Partial<Record<TransitionName, TransitionConfig>>`. The value of `<MotionConfig transitions>`: a registry of named transitions. See [Named transitions](../motion-config.md#named-transitions).

## `MotionConfig`

### `ReducedMotion`

`'user' | 'never' | 'always'`. The value of `<MotionConfig reducedMotion>`.

- `'user'` (default) follows the OS accessibility setting.
- `'never'` animates for all users.
- `'always'` never animates. Use it in tests and snapshots.

### `MotionConfigProps`

The props of `<MotionConfig>`: `reducedMotion?: ReducedMotion`, `transitions?: NamedTransitions`, and `children`.

### `MotionConfigValue`

The value that [`useMotionConfig`](./hooks.md#usemotionconfig) returns: `reducedMotion` and `transitions`. `transitions` is the merged registry of all ancestor providers. The nearest provider wins for each name.

## `<Presence>` and `<Stagger>`

### `PresenceContextValue`

The value that [`usePresence`](./hooks.md#usepresence) returns when the component is inside a `<Presence>`. The hook returns `null` outside a `<Presence>`.

```ts
interface PresenceContextValue {
  isPresent: boolean
  safeToRemove: () => void
}
```

`isPresent` becomes `false` when the parent removes the child. The child stays rendered until it calls `safeToRemove`.

### `StaggerProps`

The props of `<Stagger>`: `interval`, `delay?`, `from?: 'first' | 'last'`, `enabled?`, and `children`. See [Stagger](../stagger.md#props).

## Hook options and results

### `UseScrollResult`

The value that [`useScroll`](./hooks.md#usescroll) returns: `scrollX` and `scrollY` as `SharedValue<number>`, and `onScroll`, which you pass to the `onScroll` prop of `Motion.ScrollView` or `Motion.FlatList`.

### `UseInViewOptions`

The second argument of [`useInView`](./hooks.md#useinviewref-options): `amount`, `once`, `margin`, and `transition`.

### `UseGestureResult`

The value that [`useGesture`](./hooks.md#usegesturetransition) returns: the four 0↔1 progress values `pressed`, `focused`, `focusVisible`, and `hovered`, and two handler bags, `handlers` (`UseGestureHandlers`) and `pointerHandlers` (`UseGesturePointerHandlers`).

### `UseShadowOptions`

The argument of [`useShadow`](./hooks.md#useshadow-from-to-progress-): `from` and `to` as `ShadowConfig`, and `progress` as `SharedValue<number>`.

### `ExtrapolationMode`

`'clamp' | 'identity' | 'extend'`. What happens outside the input range of `useTransform` and `useInterpolatedStyle`.

- `'clamp'` (default) holds the first or last output value.
- `'identity'` returns the input value.
- `'extend'` continues the slope of the range.

### `NumericStyleKey` and `TransformKey`

The key unions that [`useInterpolatedStyle`](./hooks.md#useinterpolatedstyleprogress-map-options) accepts, together with `ColorStyleKey`. It writes a `NumericStyleKey` to the style directly. It puts a `TransformKey` into the `transform` array, in the order of the map. `rotate`, `rotateX`, and `rotateY` take degrees as numbers.

## Types documented on other pages

- [Transitions](../transitions.md): `TransitionConfig`, `TransitionInput`, `Transition`, `SpringTransition`, `TimingTransition`, `DecayTransition`, `NoAnimationTransition`, `EasingFunction`, `EasingFunctionFactory`.
- [MotionConfig](../motion-config.md#typed-names-optional): `TransitionName`, `RegisteredTransitions`.
- [createMotionComponent](./create-motion-component.md): `MotionComponent`.
- [Transition utilities](./transition-utilities.md): `AnimatableValue`, `AnimationCallback`, `CallbackFactory`.
- [Hooks](./hooks.md): `GestureLayerTransitions`, `Animator`, `UseTransformOptions`, `UseInterpolatedStyleOptions`, `InterpolatedStyle`, `InterpolatedStyleMap`, `UseColorTransitionOptions`, `UseColorCascadeOptions`, `ColorCascadeLayer`, `ColorStyleKey`, `ColorStyle`, `ShadowConfig`, `ShadowStyle`, `BoxShadowLayer`, `TranslateStyle`, `UseGestureHandlers`, `UseGesturePointerHandlers`, `SharedValue`.
