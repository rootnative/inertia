---
sidebar_position: 4
---

# Transitions

A `transition` prop decides **how** an `animate` value reaches its target. The default is a spring tuned for everyday UI motion; durations, decay, and instant assignment are all opt-in.

## Top-level vs per-property

`transition` accepts either one config (applied to every animating key) or a per-property map. Per-property entries always win.

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

## Named transitions

Anywhere a config object is accepted — top-level, per-property, per gesture layer, the `layout` prop, and the value-layer hooks — a name registered on the nearest [`<MotionConfig transitions>`](./motion-config#named-transitions) is accepted too:

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

Unknown names warn in development and fall back to the default spring. See [MotionConfig → Named transitions](./motion-config#named-transitions) for merge semantics and typed-name augmentation.

## Types

### `'spring'` (default)

react-spring vocabulary. The library converts to Reanimated under the hood — raw `stiffness` / `damping` never appear in the public API.

```tsx
transition={{
  type: 'spring',
  tension: 170,         // default
  friction: 26,         // default
  mass: 1,              // default
  velocity: 0,
  restSpeedThreshold: undefined,
  restDisplacementThreshold: undefined,
  delay: 0,
  repeat: undefined,
}}
```

#### Porting from raw Reanimated `stiffness` / `damping`

The conversion is a **1:1 alias rename**, not a physics formula. If you have a Reanimated `withSpring` config tuned the way you want, port it by renaming two keys:

| Reanimated raw | Inertia    |
| -------------- | ---------- |
| `stiffness`    | `tension`  |
| `damping`      | `friction` |
| `mass`         | `mass`     |

So a Material Design 3 emphasized spring (`{ stiffness: 380, damping: 32, mass: 1 }`) ports as `{ type: 'spring', tension: 380, friction: 32, mass: 1 }`. No retuning, same perceptual result.

### `'timing'`

Duration-based interpolation. Useful for opacity fades and anything where physics feel wrong.

```tsx
transition={{
  type: 'timing',
  duration: 250,        // default
  easing: Easing.inOut(Easing.ease),  // default
  delay: 0,
  repeat: undefined,
}}
```

User-supplied `easing` functions are auto-wrapped as worklets at JS time, so plain functions work in nested-transition contexts (variants, sequences, per-property maps) without manual `'worklet'` directives. Easing fns must be pure — no captured JS-thread refs.

### Easing input shape

`easing` accepts either a plain function `(t: number) => number` or a Reanimated 4 `EasingFunctionFactory` (`{ factory: () => EasingFunction }`). The resolver detects the factory shape and unwraps it automatically:

```tsx
import { Easing } from 'react-native-reanimated'

// Pass the factory directly — no `.factory()` call site needed.
transition={{
  type: 'timing',
  duration: 200,
  easing: Easing.bezier(0.2, 0, 0, 1),
}}
```

Any of the three forms — a plain `(t: number) => number` function, a pre-worklet'd easing, or a Reanimated `Easing.bezier(...)`-style factory — is accepted wherever `easing` appears.

### `cubicBezier()` — CSS easing tokens

Design systems usually store easing tokens in the W3C CSS format. `cubicBezier` builds an `easing` value from any of the three CSS spellings, so a token file is directly consumable without hand-translating to `Easing.bezier` calls:

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

The keywords map to their canonical css-easing-1 curves (`ease`, `ease-in`, `ease-out`, `ease-in-out`; `linear` maps to the identity easing). Invalid input throws at call time — a malformed token should fail at theme setup, not silently animate with the wrong curve. Per the CSS spec, `x1` / `x2` must be within `[0, 1]`; `y1` / `y2` may overshoot. The stepping keywords (`step-start` / `step-end`) and the CSS `linear(...)` function are not supported.

Combined with [named transitions](./motion-config#named-transitions), this is the recommended way to feed a theme's motion tokens into Inertia:

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

Velocity-driven decay (the gesture-flick model). Combine with `react-native-gesture-handler` to drive scroll-style flick momentum.

```tsx
transition={{
  type: 'decay',
  velocity: 800,
  deceleration: 0.998,
  clamp: [0, 600],
}}
```

`decay` cannot be repeated — `repeat` is ignored on decay configs.

### `'no-animation'`

Skip interpolation entirely; jump to the target value. Equivalent to a direct shared-value assignment, but stays inside the transition shape so per-property overrides compose:

```tsx
transition={{
  opacity: { type: 'timing', duration: 200 },
  translateY: { type: 'no-animation' },
}}
```

This is also what reduced-motion mode swaps every transition into. See [MotionConfig](./motion-config).

## `delay`

Available on every type except `'no-animation'`. Applied before the underlying animation runs:

```tsx
transition={{ type: 'spring', delay: 200 }}
```

## `repeat`

A unified shape — one prop, no flags soup. See [sequences and repeat](./sequences#repeat) for the full table.

## Defaults

| Type   | Field      | Default                     |
| ------ | ---------- | --------------------------- |
| spring | `tension`  | `170`                       |
| spring | `friction` | `26`                        |
| spring | `mass`     | `1`                         |
| timing | `duration` | `250`                       |
| timing | `easing`   | `Easing.inOut(Easing.ease)` |

If those defaults move, the sources of truth are `packages/core/src/transitions/spring.ts` (`DEFAULT_SPRING`) for the spring rows and `packages/core/src/transitions/resolve.ts` for the timing rows.
