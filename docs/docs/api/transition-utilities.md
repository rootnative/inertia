---
sidebar_position: 3
description: The JS-thread resolver functions the Motion primitives are built on, exported for building your own animated component.
---

# Transition utilities

The Motion primitives are built on these JS-thread resolver functions. The root entry exports them, so you can build your own animated component on the transition vocabulary of Inertia. The adapter packages work this way: `MotionLinearGradient` and `MotionPath` are external consumers of these same functions.

Use this layer when a component animates something that the core primitives can't reach (SVG props, gradient stops, any target that isn't `style`), and you still want it to accept the standard `transition={{ type: 'spring', tension: 180 }}` shape instead of your own config.

All of them run on the **JS thread**. Call them from render, an effect, or an event handler, and assign the result to a shared value. The baked animation runs on the UI thread. The resolution never happens at frame time. To pick a transition inside a gesture-release **worklet**, see [`buildReleaseAnimation`](./hooks.md#buildreleaseanimationtransition-tovalue-callback), the UI-thread counterpart of `resolveTransition`.

## `resolveTransition(config, toValue, callback?)`

Builds a baked Reanimated animation for one property from a `TransitionConfig` and a target value. It handles all four transition types, and it wraps `delay` and `repeat`:

| `config.type`    | Produces                                                                      |
| ---------------- | ----------------------------------------------------------------------------- |
| `'spring'`       | `withSpring` (react-spring vocabulary converted to Reanimated under the hood) |
| `'timing'`       | `withTiming` (easing auto-worklet-wrapped, see below)                         |
| `'decay'`        | `withDecay` — `toValue` is ignored; decay decelerates via its own physics     |
| `'no-animation'` | the raw `toValue` (direct assignment, no interpolation)                       |

`config` can be `undefined`. Then the default spring applies, the same as in the primitives.

```ts
import { resolveTransition, type TransitionConfig } from '@rootnative/inertia'
import { useSharedValue } from 'react-native-reanimated'

function useGlow(active: boolean, transition?: TransitionConfig) {
  const intensity = useSharedValue(0)

  useEffect(() => {
    // JS thread: bake the animation once per change…
    intensity.value = resolveTransition(transition, active ? 1 : 0) as number
    // …the UI thread just plays it.
  }, [active, transition])

  return intensity
}
```

The return type is `unknown`, because the animation objects of Reanimated aren't part of the public type surface of Inertia. Cast the result to the type of the shared value at the assignment (`as number` or `as string`), the same as the adapter packages do.

A color target works. Pass a color string as `toValue`, and the value setter of Reanimated interpolates the packed RGBA values natively. Seed the shared value with a color string, so that Reanimated treats the slot as a color from the first frame.

**`callback`** fires when the animation settles. It runs on the **UI thread**, so it must be a worklet. Write one with the `'worklet'` directive, or bridge with `runOnJS`:

```ts
import { runOnJS } from 'react-native-reanimated'

sv.value = resolveTransition(
  { type: 'timing', duration: 200 },
  1,
  (finished) => {
    'worklet'
    if (finished) runOnJS(onSettled)()
  },
) as number
```

For `'no-animation'`, the callback fires synchronously on the JS thread, because there is nothing to wait for. An animation with `repeat` forwards the callback to `withRepeat`, so the callback fires once per iteration. That is the behavior of Reanimated.

## `resolveAnimatableValue(value, base, factory?)`

The level above `resolveTransition`. It resolves a full per-property `animate` value, including a sequence and per-step overrides, into one animation. This gives a custom component the complete `animate` grammar, not only single targets.

It accepts the three shapes of `AnimatableValue`:

| Shape                      | Example                               | Resolution                                                                                                                |
| -------------------------- | ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| plain value                | `100`                                 | single `resolveTransition` call                                                                                           |
| `{ to, ...override }` step | `{ to: 100, type: 'timing' }`         | single step, override merged into `base`                                                                                  |
| array of either            | `[0, { to: 100, type: 'spring' }, 0]` | `withSequence` of resolved steps; the top-level `repeat` applies at the **sequence level**, per-step `repeat` stays local |

```ts
import {
  resolveAnimatableValue,
  type AnimatableValue,
  type TransitionConfig,
} from '@rootnative/inertia'

function usePulse(
  value: AnimatableValue<number>,
  transition?: TransitionConfig,
) {
  const sv = useSharedValue(0)

  useEffect(() => {
    // Accepts 1, { to: 1, delay: 200 }, or [0, 1, 0] equally.
    sv.value = resolveAnimatableValue(value, transition) as number
  }, [value, transition])

  return sv
}
```

The override merge follows the same rule as the primitives. If the override of a step declares a different `type` than `base`, the override wins whole. A spring field never reaches a timing step.

The optional **`factory`** argument (type `CallbackFactory`, exported from the root) makes a completion callback per step. Inertia calls it with `(phase, step)`: `('step', i)` for each sequence step, and `('animation', undefined)` for a value that isn't a sequence. It returns a worklet callback, or `undefined` to skip. This is the mechanism behind the `onAnimationEnd` of the primitives, which fires once per step. Supply it only when your component reports completion per step.

## `applyDelay(animation, delay?)`

Wraps a resolved animation in `withDelay`. A missing, zero, or negative `delay` passes through, and the animation comes back unchanged.

Its job is to delay an animation that is already resolved. That differs from a `delay` on the transition config in one important case: a keyframe sequence applies the `delay` of a base config **per step**, while `applyDelay` delays the whole sequence once. This is how the `Motion.*` primitives apply a `<Stagger>` delay. It's also the composition point for a custom component that wants to take part in one:

```ts
import {
  applyDelay,
  resolveAnimatableValue,
  useStaggerDelay,
} from '@rootnative/inertia'

function useStaggeredValue(
  value: AnimatableValue<number>,
  transition?: TransitionConfig,
) {
  const sv = useSharedValue(0)
  const staggerDelay = useStaggerDelay() // 0 outside a <Stagger>

  useEffect(() => {
    sv.value = applyDelay(
      resolveAnimatableValue(value, transition),
      staggerDelay,
    ) as number
  }, [value, transition])

  return sv
}
```

Delays add up. An animation whose own config carries `delay: 30`, wrapped in `applyDelay(…, 100)`, starts after 130 ms. The two delays add, and neither replaces the other.

## `ensureWorkletEasing(easing)`

Normalizes any accepted easing input into a worklet function that `withTiming` can consume. Three inputs, one output:

- **Already a worklet** (a Reanimated `Easing.*` curve, or a user function that the worklets Babel plugin processed): returned as it is.
- **A Reanimated 4 `EasingFunctionFactory`** (what `Easing.bezier(...)` returns since v4): unwrapped with `.factory()` for you, so nobody has to know that the API changed.
- **A plain JS function**: wrapped in a closure with the `'worklet'` directive, so the nested-transition validation of Reanimated 3.9+ doesn't crash with `[Reanimated] The easing function is not a worklet`.

`undefined` passes through as `undefined`, and the caller applies its own default.

```ts
import { ensureWorkletEasing } from '@rootnative/inertia'
import { Easing, withTiming } from 'react-native-reanimated'

// All three normalize correctly:
ensureWorkletEasing((t) => t * t) // plain fn → worklet-wrapped
ensureWorkletEasing(Easing.bezier(0.33, 1, 0.68, 1)) // factory → unwrapped
ensureWorkletEasing(Easing.inOut(Easing.ease)) // worklet → as-is

sv.value = withTiming(1, {
  duration: 300,
  easing: ensureWorkletEasing(userEasing) ?? Easing.inOut(Easing.ease),
})
```

You need this only when you call `withTiming` yourself with an easing from the user. `resolveTransition`, `resolveAnimatableValue`, and all the Motion primitives already run every `easing` through it.

The wrapped function must be **pure**: no captured JS-thread refs, no shared mutable state, no calls to APIs that aren't worklets. The wrapper carries the user function across the worklet boundary in a closure. Anything impure in that closure is stale or crashes on the UI thread.

## `cubicBezier(x1, y1, x2, y2)` / `cubicBezier(css)`

Builds a `timing.easing` value from cubic-bezier control points: four numbers, a W3C CSS `cubic-bezier(...)` string, or a CSS easing keyword (`'linear'`, `'ease'`, `'ease-in'`, `'ease-out'`, `'ease-in-out'`):

```ts
import { cubicBezier } from '@rootnative/inertia'

cubicBezier(0.2, 0, 0, 1)
cubicBezier('cubic-bezier(0.2, 0, 0, 1)') // design-token form
cubicBezier('ease-out')
```

It returns exactly what `timing.easing` accepts: the bezier factory of Reanimated, which `ensureWorkletEasing` handles like every other easing input. So it works in the `transition` prop, in [named transitions](../motion-config#named-transitions), and everywhere else that the resolvers on this page take a config. Invalid input throws: `x1` and `x2` must be finite and within `[0, 1]`. An unsupported token (`step-start`, `linear(...)`) throws too. Inertia doesn't approximate it.

See [Transitions → cubicBezier](../transitions#cubicbezier--css-easing-tokens) for the token-file workflow.

## `resolveNamedTransition(input, registry)`

Resolves a `TransitionConfig | TransitionName` input into a concrete config. A config object passes through unchanged. Inertia looks a name up in `registry`. An unknown name warns in dev and falls back to the library default spring. Pair it with `useNamedTransitions()`, which reads the merged registry of the nearest [`<MotionConfig transitions>`](../motion-config#named-transitions). Then a custom component accepts a registered name wherever it accepts a config:

```tsx
import {
  resolveNamedTransition,
  resolveTransition,
  useNamedTransitions,
  type TransitionInput,
} from '@rootnative/inertia'

function useMyAnimatedProp(target: number, transition?: TransitionInput) {
  const registry = useNamedTransitions()
  const config = resolveNamedTransition(transition, registry)
  // config: TransitionConfig | undefined — feed it to resolveTransition
  sv.value = resolveTransition(config, target)
}
```

This is how the Motion primitives and the value-layer hooks support `transition="selection"` internally. The adapter packages use the same two calls to join the registry.

## `transitionForKey(transition, key)`

Returns the transition that a `transition` prop gives one key. A custom animated component calls it once for each prop that it animates.

- A top-level config or a registered name applies to every key. It comes back as given.
- A map gives a key its own entry.
- A key with no entry gets the config keys of the map as its default. `{ type: 'spring', tension: 120, opacity: { type: 'timing' } }` springs every key except `opacity`. An entry replaces the default whole. The two don't merge.

A name comes back as a string. Pass the result to `resolveNamedTransition` to get a config.

```tsx
import {
  resolveNamedTransition,
  transitionForKey,
  useNamedTransitions,
  type TransitionConfig,
  type TransitionInput,
} from '@rootnative/inertia'

type RadiusTransition = TransitionInput | { r?: TransitionInput }

function useRadiusTransition(
  transition: RadiusTransition | undefined,
): TransitionConfig | undefined {
  const registry = useNamedTransitions()
  return resolveNamedTransition(transitionForKey(transition, 'r'), registry)
}
```

This is the lookup the Motion primitives, the gesture hooks, and the svg and gradients adapters use.

## `isTopLevelTransition(value)`

Returns `true` when `value` is a single `TransitionConfig` and `false` when it is a per-property or per-layer map. The test is structural: every key on the object must be a known transition field (`type`, `tension`, `friction`, `mass`, `velocity`, `duration`, `easing`, `delay`, `repeat`, `deceleration`, `clamp`). An empty object, `null`, a string, and a map keyed by prop names all return `false`. A map that also carries config keys, such as `{ type: 'spring', opacity: { … } }`, returns `false`, and those keys are its default.

Use it when a custom animated component must tell the two shapes apart. To read the transition for one key, use `transitionForKey`, which runs this test and also gives a key the default of a mixed map. Don't test `'type' in transition`. `SpringTransition.type` is optional, so `{ tension: 300, friction: 20 }` is a valid top-level config with no `type` key. The `in` test reads it as a map, finds nothing under the prop name, and falls back to the default spring with no warning.

The test stays safe when the config vocabulary grows: a valid map key is a style or prop name, and those never overlap the config field names.

## `stableSig(value)`

Returns a string signature of `value` that is stable across renders when the content is the same. It sorts the keys at every level, so two objects with the same entries in a different order give the same signature. `undefined` gives an empty string, and a function gives `null` inside the signature.

Use it as an effect dependency in a custom animated component, in place of the `transition` object itself. An inline `transition={{ type: 'timing', duration: 600 }}` literal is a new object on every render of the parent. An effect that depends on that object fires on every parent render, and it assigns the animation again from its current value with the full duration. An effect that depends on `stableSig(transition)` fires only when the config changes.

```tsx
import { resolveTransition, stableSig } from '@rootnative/inertia'

function useAnimatedRadius(
  sv: SharedValue<number>,
  target: number,
  transition?: TransitionConfig,
) {
  const transitionSig = stableSig(transition)
  useEffect(() => {
    sv.value = resolveTransition(transition, target)
    // `transition` is read through its signature on purpose.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sv, target, transitionSig])
}
```

The factory primitives and the `-gradients` and `-svg` adapters key their own `transition` effects this way.

## `TRANSPARENT`

The colour that seeds a colour shared value when a custom component has no other source for it.

```tsx
import { resolveTransition, TRANSPARENT } from '@rootnative/inertia'

// A `fill` the consumer only supplied through `animate` has no starting value.
const fill = useSharedValue(props.fill ?? TRANSPARENT)
```

It exists because the obvious choice, `'transparent'`, used to be wrong, and nothing pointed at it. Reanimated dispatches an animation on the runtime shape of its **source** value, and `isColor()` gates the RGBA path. Up to Reanimated 4.4, the colour table mapped `transparent` to `undefined`, while every other CSS colour name mapped to a number. So the keyword was the one name that failed the gate. A slot at rest at `'transparent'` took the prefix-number-suffix branch for values like `'100%'`, gave `NaN`, and never became a colour.

The symptom depended on the transition, and that made it hard to find. `withTiming` snaps to its target when the duration ends, so the colour still arrived and everything looked fine. `withSpring`, the default, decides that it settled by a comparison against `NaN`. So it never settled, the colour never appeared, and the frame loop never stopped.

**Reanimated 4.5 fixed the colour table.** Every Reanimated in the supported peer band of Inertia (`>=4.7.0 <4.8.0`) has that fix, so the keyword now animates like any other name. `TRANSPARENT` stays exported for two reasons. It is `'rgba(0, 0, 0, 0)'`, the same colour with an unambiguous spelling. And it stays the safe seed for code that can also run against an older Reanimated.

:::note
Only a value passed to `withSpring` or `withTiming` is affected. `interpolateColor` parses `'transparent'` correctly. So a component that interpolates colours itself ([`useShadow`](./hooks.md#useshadow-from-to-progress-), [`useColorTransition`](./hooks.md#usecolortransitionprogress-from-to-options), the `gesture` cascade) can use the keyword.
:::

## Which layer to use

| You're writing…                                                     | Use                                                                                    |
| ------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| a component with declarative `animate` props over a `style` target  | [`createMotionComponent`](./create-motion-component.md) — no resolver calls needed     |
| a component animating non-`style` props (SVG, gradients, text runs) | `resolveAnimatableValue` (full grammar) or `resolveTransition` (single targets)        |
| a gesture-release worklet picking a transition on the UI thread     | [`buildReleaseAnimation`](./hooks.md#buildreleaseanimationtransition-tovalue-callback) |
| a manual `withTiming` call with consumer-supplied easing            | `ensureWorkletEasing`                                                                  |
| a colour shared value with no starting value to seed from           | `TRANSPARENT`                                                                          |
