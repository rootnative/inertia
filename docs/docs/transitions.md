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

If those defaults move, the source of truth is `packages/core/src/transitions/resolve.ts`.
