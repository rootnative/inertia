---
sidebar_position: 9
---

# MotionConfig

A provider for subtree-wide animation config: how descendant Motion primitives respond to the OS reduce-motion accessibility setting, and a registry of [named transitions](#named-transitions) usable anywhere a transition config is accepted.

:::tip Free accessibility win for migrators
Apps moving from hand-rolled `useSharedValue` + `useAnimatedStyle` to Inertia primitives pick up reduce-motion compliance automatically — every `Motion.*` component reads the OS setting via [`useShouldReduceMotion()`](#reading-the-resolved-value) without any per-component plumbing. If you previously had no reduce-motion handling, you have it now.
:::

## Default — respect the OS

By default (and without any provider in the tree), Inertia respects the OS reduce-motion setting. When the user enables it, every per-key transition is swapped for `'no-animation'` — values snap to their target instantly. Sequences still iterate, but each step settles immediately.

```tsx
import { MotionConfig } from '@rootnative/inertia'

export function App() {
  return <MotionConfig reducedMotion="user">{/* Your app */}</MotionConfig>
}
```

`reducedMotion="user"` is the default value for the prop, so wrapping the root explicitly is mostly a documentation gesture — it's already what happens without a provider.

## Modes

| Value      | Behavior                                                                                     |
| ---------- | -------------------------------------------------------------------------------------------- |
| `'user'`   | Defer to the OS accessibility setting. The right default for app-level wrappers.             |
| `'never'`  | Animate regardless of the OS setting. Use sparingly — e.g. essential onboarding transitions. |
| `'always'` | Never animate, regardless of OS setting. Useful for tests and snapshots.                     |

## Scope

`<MotionConfig>` is just a context provider. Wrap a subtree to override behavior locally:

```tsx
<MotionConfig reducedMotion="user">
  <App />

  <MotionConfig reducedMotion="never">
    <CriticalOnboardingFlow />
  </MotionConfig>
</MotionConfig>
```

Nested providers **inherit** from their ancestor: a provider that omits `reducedMotion` keeps the ancestor's mode, and `transitions` maps merge per name (child wins). A transitions-only provider in the middle of the tree never disturbs an outer `reducedMotion` override.

## Named transitions

`transitions` registers named transition configs for the subtree. Every place that accepts a `TransitionConfig` also accepts a registered name: the `transition` prop (top-level **and** per-property / per gesture layer), the `layout` prop, and the value-layer hooks (`useAnimation`, `useSpring`, `useBooleanSpring`, `useGesture`, `useGestureLayer`).

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

The names are **your** vocabulary — design-system tokens, semantic roles, whatever your app standardizes on. Inertia ships no presets; the registry is the mechanism that lets a theme file (MD3, iOS-style, Fluent, your own) be the single source of truth for motion values instead of copy-pasted config objects at every call site.

Semantics:

- **Nearest provider wins.** Names resolve against the merged registry of all ancestor `<MotionConfig>` providers.
- **Nested providers merge.** A child provider's `transitions` map merges into the ancestor registry; same-named entries are overridden by the child.
- **Unknown names degrade softly.** An unregistered name warns in development and falls back to the library default spring — the animation still runs.
- **Spring-only hooks stay spring-only.** `useSpring` / `useBooleanSpring` accept names, but a name registered as `timing` / `decay` / `no-animation` warns in dev and falls back to the default spring. Use `useAnimation` when the named transition's type should be honored.

### Typed names (optional)

Out of the box, any string is accepted where a name is (`TransitionName` is `string`). To get autocomplete and compile-time typo checking, augment the `RegisteredTransitions` interface with your registry's keys:

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

With the augmentation in place, `transition="selectoin"` is a compile error. The value type is ignored — only the keys matter.

### Consuming the registry from custom components

Adapter packages and custom animated components can support names on their own surface with `useNamedTransitions()` + `resolveNamedTransition()`:

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

Two hooks are available for components that want to react to the active mode:

```tsx
import { useMotionConfig, useShouldReduceMotion } from '@rootnative/inertia'

function MyComponent() {
  const { reducedMotion } = useMotionConfig()
  const reduce = useShouldReduceMotion()
  // reduce: boolean — already accounts for the OS setting when mode is 'user'
}
```

`useShouldReduceMotion()` is what every Motion primitive uses internally. In `'user'` mode it reads the OS setting via Reanimated's `useReducedMotion()`, which captures the value **once at app start** — toggling the accessibility setting while the app is running takes effect on the next launch, not immediately. (`'never'` and `'always'` don't consult the OS at all, and changing the `reducedMotion` prop itself re-renders normally.)
