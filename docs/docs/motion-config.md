---
sidebar_position: 9
---

# MotionConfig

A provider that gates how descendant Motion primitives respond to the OS reduce-motion accessibility setting.

## Default — respect the OS

By default (and without any provider in the tree), Inertia respects the OS reduce-motion setting. When the user enables it, every per-key transition is swapped for `'no-animation'` — values snap to their target instantly. Sequences still iterate, but each step settles immediately.

```tsx
import { MotionConfig } from '@onlynative/inertia'

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

## Reading the resolved value

Two hooks are available for components that want to react to the active mode:

```tsx
import { useMotionConfig, useShouldReduceMotion } from '@onlynative/inertia'

function MyComponent() {
  const { reducedMotion } = useMotionConfig()
  const reduce = useShouldReduceMotion()
  // reduce: boolean — already accounts for the OS setting when mode is 'user'
}
```

`useShouldReduceMotion()` is what every Motion primitive uses internally. It subscribes to OS changes via Reanimated's `useReducedMotion()`, so toggling the accessibility setting at runtime re-renders subscribed primitives.
