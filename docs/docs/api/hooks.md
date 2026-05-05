---
sidebar_position: 1
---

# Hooks

The escape-hatch surface — drop here when you need imperative control beyond what the props expose.

## `useVariants(variants, initial?)`

Build a controller for a variants map. Pass it through `controller={...}` to drive transitions imperatively.

```ts
import { useVariants } from '@onlynative/inertia'

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

The controller is identity-stable — the hook returns the same object across renders.

See [Variants](../variants) for the props-side usage.

## `useMotionConfig()`

Read the active `<MotionConfig>` value:

```ts
import { useMotionConfig } from '@onlynative/inertia'

const { reducedMotion } = useMotionConfig()
// 'user' | 'never' | 'always'
```

Returns the default (`{ reducedMotion: 'user' }`) when no provider is in the tree.

## `useShouldReduceMotion()`

Resolve the active reduced-motion mode to a boolean. `'user'` consults Reanimated's OS-backed hook; `'never'` and `'always'` shortcut to `false` / `true`.

```ts
import { useShouldReduceMotion } from '@onlynative/inertia'

function MyVideoIntro() {
  const reduce = useShouldReduceMotion()
  if (reduce) return <StaticPoster />
  return <AnimatedIntro />
}
```

This is what every Motion primitive uses to decide whether to swap transitions for `'no-animation'`. Subscribes to OS changes — components re-render when the user toggles the setting at runtime.

## `usePresence()`

Read the per-child presence context inside a custom component you'd like to behave like a Motion primitive under `<Presence>`:

```ts
import { usePresence } from '@onlynative/inertia'

function CustomExitable() {
  const presence = usePresence()
  // presence is null when no <Presence> ancestor exists
  // presence?.isPresent flips false when the parent removes us
  // presence?.safeToRemove() — call once exit completes
}
```

See [Presence](../presence) for the higher-level prop-driven usage.
