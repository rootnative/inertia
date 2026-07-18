---
sidebar_position: 3
---

# Transition utilities

The JS-thread resolver functions the Motion primitives are built on, exported for anyone building their own animated component on top of Inertia's transition vocabulary. This is exactly how the adapter packages work — `MotionLinearGradient` and `MotionPath` are external consumers of these same functions.

Reach for this layer when a component animates something the core primitives can't reach (SVG props, gradient stops, any non-`style` target) but you still want it to accept the standard `transition={{ type: 'spring', tension: 180 }}` shape instead of inventing your own config.

All of them run on the **JS thread** — call them from render, effects, or event handlers, and assign the result to a shared value. The baked animation executes on the UI thread; the resolution itself never happens at frame time. (For picking a transition inside a gesture-release **worklet**, see [`buildReleaseAnimation`](./hooks.md#buildreleaseanimationtransition-tovalue) — that's the UI-thread counterpart to `resolveTransition`.)

## `resolveTransition(config, toValue, callback?)`

Build a baked Reanimated animation for a single property from a `TransitionConfig` and a target value. Handles all four transition types plus `delay` / `repeat` wrapping:

| `config.type`    | Produces                                                                      |
| ---------------- | ----------------------------------------------------------------------------- |
| `'spring'`       | `withSpring` (react-spring vocabulary converted to Reanimated under the hood) |
| `'timing'`       | `withTiming` (easing auto-worklet-wrapped, see below)                         |
| `'decay'`        | `withDecay` — `toValue` is ignored; decay decelerates via its own physics     |
| `'no-animation'` | the raw `toValue` (direct assignment, no interpolation)                       |

`config` may be `undefined` — the default spring applies, same as the primitives.

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

The return type is `unknown` because Reanimated's animation objects aren't part of Inertia's public type surface — cast to the shared value's type at the assignment site (`as number` / `as string`), the same way the adapter packages do.

Color targets work: pass a color string as `toValue` and Reanimated's value setter interpolates the packed RGBA representations natively (seed the shared value with a color string so the slot is recognized as a color from the first frame).

**`callback`** fires when the animation settles. It runs on the **UI thread**, so it must be a worklet — either author one with the `'worklet'` directive or bridge with `runOnJS`:

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

For `'no-animation'` the callback fires synchronously on the JS thread (there's nothing to wait for). Repeat-wrapped animations forward the callback to `withRepeat`, so it fires once per iteration — Reanimated's own behavior.

## `resolveAnimatableValue(value, base, factory?)`

The level above `resolveTransition`: resolve a full per-property `animate` value — including sequences and per-step overrides — into one animation. This is what gives a custom component the complete `animate` grammar, not just single targets.

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

Override merging follows the same rule as the primitives: if a step's override declares a different `type` than `base`, the override wins outright — spring fields never bleed into a timing step.

The optional **`factory`** argument produces per-step completion callbacks. It's called with `(phase, step)` — `('step', i)` for each sequence step, `('animation', undefined)` for non-sequences — and returns a worklet callback (or `undefined` to skip). This is the mechanism behind the primitives' `onAnimationEnd` firing once per step; supply it only if your component surfaces step-level completion.

## `ensureWorkletEasing(easing)`

Normalize any accepted easing input into a worklet function `withTiming` can consume. Three inputs, one output:

- **Already a worklet** (a Reanimated `Easing.*` curve, or a user function processed by the worklets Babel plugin) → returned as-is.
- **Reanimated 4 `EasingFunctionFactory`** (what `Easing.bezier(...)` returns since v4) → unwrapped via `.factory()` automatically, so nobody has to know that API changed.
- **Plain JS function** → wrapped in a `'worklet'`-directive closure so Reanimated 3.9+'s nested-transition validation doesn't crash with `[Reanimated] The easing function is not a worklet`.

`undefined` passes through as `undefined` (callers apply their own default).

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

You only need this when calling `withTiming` yourself with user-supplied easing. `resolveTransition` and `resolveAnimatableValue` already run every `easing` through it, as do all the Motion primitives.

The wrapped function must be **pure** — no JS-thread captured refs, no shared mutable state, no calls to non-worklet APIs. The wrapper carries the user function across the worklet boundary via closure; anything impure it closes over will be stale or crash on the UI thread.

## `cubicBezier(x1, y1, x2, y2)` / `cubicBezier(css)`

Build a `timing.easing` value from cubic-bezier control points — four numbers, a W3C CSS `cubic-bezier(...)` string, or a CSS easing keyword (`'linear'`, `'ease'`, `'ease-in'`, `'ease-out'`, `'ease-in-out'`):

```ts
import { cubicBezier } from '@rootnative/inertia'

cubicBezier(0.2, 0, 0, 1)
cubicBezier('cubic-bezier(0.2, 0, 0, 1)') // design-token form
cubicBezier('ease-out')
```

Returns exactly what `timing.easing` accepts (Reanimated's bezier factory — `ensureWorkletEasing` handles it like every other easing input), so it works in the `transition` prop, in [named transitions](../motion-config#named-transitions), and anywhere else this page's resolvers take a config. Invalid input throws: `x1` / `x2` must be finite and within `[0, 1]`, and unsupported tokens (`step-start`, `linear(...)`) are rejected rather than approximated.

See [Transitions → cubicBezier](../transitions#cubicbezier--css-easing-tokens) for the token-file workflow this enables.

## `resolveNamedTransition(input, registry)`

Resolve a `TransitionConfig | TransitionName` input into a concrete config. A config object passes through untouched; a name is looked up in `registry` — unknown names warn in dev and fall back to the library default spring. Pair it with `useNamedTransitions()` (which reads the merged registry off the nearest [`<MotionConfig transitions>`](../motion-config#named-transitions)) to make a custom component accept registered names wherever it accepts a config:

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

This is how the Motion primitives and value-layer hooks support `transition="selection"` internally; adapter packages use the same two calls to join the registry.

## Which layer to use

| You're writing…                                                     | Use                                                                                |
| ------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| a component with declarative `animate` props over a `style` target  | [`createMotionComponent`](./create-motion-component.md) — no resolver calls needed |
| a component animating non-`style` props (SVG, gradients, text runs) | `resolveAnimatableValue` (full grammar) or `resolveTransition` (single targets)    |
| a gesture-release worklet picking a transition on the UI thread     | [`buildReleaseAnimation`](./hooks.md#buildreleaseanimationtransition-tovalue)      |
| a manual `withTiming` call with consumer-supplied easing            | `ensureWorkletEasing`                                                              |
