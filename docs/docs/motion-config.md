---
sidebar_position: 9
description: 'A provider for subtree-wide animation config: OS reduce-motion behavior and a registry of named transitions.'
---

# MotionConfig

A provider for the animation config of a subtree. It sets how the Motion primitives below it respond to the reduce-motion accessibility setting of the OS, and it holds a registry of [named transitions](#named-transitions) that you can use anywhere a transition config is accepted.

:::tip Free accessibility win when you migrate
An app that moves from hand-written `useSharedValue` and `useAnimatedStyle` code to the Inertia primitives gets reduce-motion support for free. Every `Motion.*` component reads the OS setting through [`useShouldReduceMotion()`](#reading-the-resolved-value), with no setup per component. If you had no reduce-motion handling before, you have it now.
:::

## Default — respect the OS

By default, and with no provider in the tree, Inertia respects the reduce-motion setting of the OS. When the user enables it, Inertia swaps every per-key transition for `'no-animation'`, and values snap to their target at once. A sequence still iterates, but each step settles at once.

```tsx
import { MotionConfig } from '@rootnative/inertia'

export function App() {
  return <MotionConfig reducedMotion="user">{/* Your app */}</MotionConfig>
}
```

`reducedMotion="user"` is the default value of the prop. An explicit wrapper around the root only documents the intent, because the same happens with no provider.

## Modes

| Value      | Behavior                                                                                     |
| ---------- | -------------------------------------------------------------------------------------------- |
| `'user'`   | Defer to the OS accessibility setting. The right default for app-level wrappers.             |
| `'never'`  | Animate regardless of the OS setting. Use sparingly — e.g. essential onboarding transitions. |
| `'always'` | Never animate, regardless of OS setting. Useful for tests and snapshots.                     |

## Scope

`<MotionConfig>` is a context provider. Wrap a subtree to override the behavior there:

```tsx
<MotionConfig reducedMotion="user">
  <App />

  <MotionConfig reducedMotion="never">
    <CriticalOnboardingFlow />
  </MotionConfig>
</MotionConfig>
```

A nested provider **inherits** from its ancestor. A provider that omits `reducedMotion` keeps the mode of the ancestor, and the `transitions` maps merge per name, with the child first. A provider with only `transitions` in the middle of the tree never disturbs an outer `reducedMotion` override.

## Named transitions

`transitions` registers named transition configs for the subtree. Every place that accepts a `TransitionConfig` also accepts a registered name: the `transition` prop (top-level, per property, **and** per gesture layer), the `layout` prop, and the value-layer hooks (`useAnimation`, `useSpring`, `useBooleanSpring`, `useGesture`, `useGestureLayer`).

```tsx
<MotionConfig
  transitions={{
    'state-hover': { type: 'timing', duration: 150 },
    'state-press': { type: 'timing', duration: 100 },
    selection: { type: 'spring', tension: 380, friction: 33 },
  }}
>
  {/* Anywhere below the provider: */}
  <Motion.View
    animate={{ scale: isSelected ? 1 : 0.8 }}
    transition="selection"
  />
  <Motion.View
    animate={{ opacity: 1, translateY: 0 }}
    transition={{ opacity: 'state-hover', translateY: 'selection' }}
  />
</MotionConfig>
```

```ts
const progress = useBooleanSpring(checked, 'selection')
const fade = useAnimation(visible ? 1 : 0, 'state-hover')
```

The names are **your** vocabulary: design-system tokens, semantic roles, or whatever your app standardizes on. Inertia ships no presets. The registry lets a theme file (MD3, iOS style, Fluent, or your own) be the one source of truth for motion values, instead of copied config objects at every call site.

The rules:

- **The nearest provider wins.** A name resolves against the merged registry of all ancestor `<MotionConfig>` providers.
- **Nested providers merge.** The `transitions` map of a child provider merges into the ancestor registry. The child overrides an entry with the same name.
- **An unknown name degrades softly.** An unregistered name warns in development and falls back to the library default spring. The animation still runs.
- **A spring-only hook stays spring-only.** `useSpring` and `useBooleanSpring` accept a name, but a name registered as `timing`, `decay`, or `no-animation` warns in dev and falls back to the default spring. Use `useAnimation` when the type of the named transition must apply.

### Typed names (optional)

By default, any string is accepted where a name is (`TransitionName` is `string`). To get autocomplete and a compile-time typo check, augment the `RegisteredTransitions` interface with the keys of your registry:

```ts
// motion.d.ts (anywhere in your app's include path)
import type { TransitionConfig } from '@rootnative/inertia'

declare module '@rootnative/inertia' {
  interface RegisteredTransitions {
    'state-hover': TransitionConfig
    'state-press': TransitionConfig
    selection: TransitionConfig
  }
}
```

With the augmentation in place, `transition="selectoin"` is a compile error. TypeScript ignores the value type. Only the keys matter.

### Consuming the registry from custom components

An adapter package or a custom animated component can support names on its own surface with `useNamedTransitions()` and `resolveNamedTransition()`:

```ts
import {
  resolveNamedTransition,
  useNamedTransitions,
} from '@rootnative/inertia'

function useMyAnimatedThing(transition?: TransitionConfig | TransitionName) {
  const registry = useNamedTransitions()
  const config = resolveNamedTransition(transition, registry)
  // config is a concrete TransitionConfig | undefined
}
```

## Reading the resolved value

Two hooks let a component react to the active mode:

```tsx
import { useMotionConfig, useShouldReduceMotion } from '@rootnative/inertia'

function MyComponent() {
  const { reducedMotion } = useMotionConfig()
  const reduce = useShouldReduceMotion()
  // reduce: boolean — already accounts for the OS setting when mode is 'user'
}
```

Every Motion primitive uses `useShouldReduceMotion()` internally. In `'user'` mode, it reads the OS setting through the `useReducedMotion()` of Reanimated, which captures the value **once at app start**. A change of the accessibility setting while the app runs takes effect on the next launch, not at once. `'never'` and `'always'` don't consult the OS at all. A change of the `reducedMotion` prop itself re-renders normally.
