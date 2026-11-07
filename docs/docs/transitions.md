---
sidebar_position: 4
description: 'The transition prop decides how an animate value reaches its target: springs by default, with durations, decay, and instant assignment opt-in.'
---

# Transitions

The `transition` prop decides **how** an `animate` value reaches its target. The default is a spring tuned for everyday UI motion. Durations, decay, and instant assignment are opt-in.

## Top-level vs per-property

`transition` accepts one config, which applies to every animating key, or a per-property map. A per-property entry always wins.

```tsx
// One config, applies to all animating keys
<Motion.View animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'spring' }} />

// Per-property — opacity uses timing, translateY uses spring
<Motion.View
  animate={{ opacity: 1, translateY: 0 }}
  transition={{
    opacity: { type: 'timing', duration: 200 },
    translateY: { type: 'spring', tension: 180, friction: 12 },
  }}
/>
```

A per-property map can also carry config keys next to its entries. Those keys are the default for every key that the map doesn't name, and for each gesture layer with no entry of its own:

```tsx
// Every key springs at 120 / 18, except opacity, which uses timing
<Motion.View
  animate={{ opacity: 1, translateY: 0, scale: 1 }}
  transition={{
    type: 'spring',
    tension: 120,
    friction: 18,
    opacity: { type: 'timing', duration: 320 },
  }}
/>
```

An entry replaces the default whole. The two don't merge, so `opacity` above has no `tension`, and a `delay` in the default doesn't reach `opacity`.

## Named transitions

Every place that accepts a config object also accepts a name from the nearest [`<MotionConfig transitions>`](./motion-config#named-transitions). That covers the top-level transition, a per-property entry, a gesture layer, the `layout` prop, and the value-layer hooks:

```tsx
<MotionConfig
  transitions={{ selection: { type: 'spring', tension: 380, friction: 33 } }}
>
  <Motion.View animate={{ scale: 1 }} transition="selection" />
  <Motion.View
    animate={{ opacity: 1, scale: 1 }}
    transition={{
      opacity: { type: 'timing', duration: 150 },
      scale: 'selection',
    }}
  />
</MotionConfig>
```

An unknown name warns in development and falls back to the default spring. See [MotionConfig → Named transitions](./motion-config#named-transitions) for the merge rules and the typed-name augmentation.

## Types

### `'spring'` (default)

A spring uses the react-spring vocabulary. The library converts it to Reanimated internally. The raw `stiffness` and `damping` names never appear in the public API.

```tsx
transition={{
  type: 'spring',
  tension: 170,         // default
  friction: 26,         // default
  mass: 1,              // default
  velocity: 0,
  delay: 0,
  repeat: undefined,
}}
```

#### Porting from raw Reanimated `stiffness` / `damping`

The conversion is a **1:1 alias rename**, not a physics formula. If you have a tuned Reanimated `withSpring` config, port it: rename two keys.

| Reanimated raw | Inertia    |
| -------------- | ---------- |
| `stiffness`    | `tension`  |
| `damping`      | `friction` |
| `mass`         | `mass`     |

So a Material Design 3 emphasized spring (`{ stiffness: 380, damping: 32, mass: 1 }`) ports as `{ type: 'spring', tension: 380, friction: 32, mass: 1 }`. You don't retune it, and the motion looks the same.

### `'timing'`

A timing transition interpolates over a duration. Use it for opacity fades and for any motion where a spring looks wrong.

```tsx
transition={{
  type: 'timing',
  duration: 250,        // default
  easing: Easing.inOut(Easing.ease),  // default
  delay: 0,
  repeat: undefined,
}}
```

A custom `easing` function must be a worklet: put the `'worklet'` directive as the first statement of the function. The built-in `Easing.*` helpers of Reanimated and Inertia's `cubicBezier()` are worklets already. A plain function warns in dev. The fallback wrapper works on web, but a native build rejects it when the transition runs on the UI thread, because the closure of the wrapper holds the opaque plain function. An easing function must also be pure, with no captured JS-thread refs.

### Easing input shape

`easing` accepts a plain function `(t: number) => number` or a Reanimated 4 `EasingFunctionFactory` (`{ factory: () => EasingFunction }`). The resolver detects the factory shape and unwraps it for you:

```tsx
import { Easing } from 'react-native-reanimated'

// Pass the factory directly — no `.factory()` call site needed.
transition={{
  type: 'timing',
  duration: 200,
  easing: Easing.bezier(0.2, 0, 0, 1),
}}
```

Every place that takes `easing` accepts all three forms: a plain `(t: number) => number` function, an easing that is already a worklet, or a Reanimated factory such as `Easing.bezier(...)`.

### `cubicBezier()` — CSS easing tokens

A design system usually stores its easing tokens in the W3C CSS format. `cubicBezier` builds an `easing` value from any of the three CSS spellings, so you can use a token file as it is, with no `Easing.bezier` calls:

```tsx
import { cubicBezier } from '@rootnative/inertia'

cubicBezier(0.2, 0, 0, 1) // number form
cubicBezier('cubic-bezier(0.2, 0, 0, 1)') // CSS token form
cubicBezier('ease-out') // CSS keywords, incl. 'linear'

transition={{
  type: 'timing',
  duration: 200,
  easing: cubicBezier(theme.motion.easingStandard),
}}
```

The keywords map to their canonical css-easing-1 curves (`ease`, `ease-in`, `ease-out`, `ease-in-out`). `linear` maps to the identity easing. Invalid input throws at call time, so a malformed token fails at theme setup and doesn't animate with the wrong curve. As in the CSS spec, `x1` and `x2` must be within `[0, 1]`, and `y1` and `y2` can overshoot. The stepping keywords (`step-start`, `step-end`) and the CSS `linear(...)` function are not supported.

Together with [named transitions](./motion-config#named-transitions), this is the recommended way to feed the motion tokens of a theme into Inertia:

```tsx
<MotionConfig
  transitions={{
    'state-hover': {
      type: 'timing',
      duration: 150,
      easing: cubicBezier(theme.motion.easingStandard), // 'cubic-bezier(0.2, 0, 0, 1)'
    },
  }}
>
```

### `'decay'`

A decay starts from a velocity and slows down, like a flick. Combine it with `react-native-gesture-handler` for scroll-style flick momentum.

```tsx
transition={{
  type: 'decay',
  velocity: 800,
  deceleration: 0.998,
  clamp: [0, 600],
}}
```

A decay can't repeat. A decay config ignores `repeat`.

### `'no-animation'`

This type skips the interpolation and jumps to the target value. It equals a direct shared-value assignment, but it stays inside the transition shape, so per-property overrides compose:

```tsx
transition={{
  opacity: { type: 'timing', duration: 200 },
  translateY: { type: 'no-animation' },
}}
```

Reduced-motion mode also swaps every transition into this type. See [MotionConfig](./motion-config).

## `delay`

Every type except `'no-animation'` takes `delay`. The delay runs before the animation starts:

```tsx
transition={{ type: 'spring', delay: 200 }}
```

## `repeat`

`repeat` has one shape, with no separate flags. See [sequences and repeat](./sequences#repeat) for the full table.

## Defaults

| Type   | Field      | Default                     |
| ------ | ---------- | --------------------------- |
| spring | `tension`  | `170`                       |
| spring | `friction` | `26`                        |
| spring | `mass`     | `1`                         |
| timing | `duration` | `250`                       |
| timing | `easing`   | `Easing.inOut(Easing.ease)` |

The source of truth for the spring rows is `DEFAULT_SPRING` in `packages/core/src/transitions/spring.ts`. The source of truth for the timing rows is `packages/core/src/transitions/resolve.ts`.
