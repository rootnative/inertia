---
sidebar_position: 6
---

# Variants

Named animation states. Define them once, then drive transitions by passing a key — no extra hook required for the common case.

## Declarative

```tsx
import { Motion } from '@onlynative/inertia'

const variants = {
  closed: { translateY: 100, opacity: 0 },
  open: { translateY: 0, opacity: 1 },
} as const

export function Sheet({ isOpen }: { isOpen: boolean }) {
  return (
    <Motion.View
      variants={variants}
      animate={isOpen ? 'open' : 'closed'}
      transition={{ type: 'spring', tension: 220, friction: 22 }}
      style={sheetStyles.sheet}
    />
  )
}
```

Annotate the variants map with `as const` so variant keys autocomplete on `animate`.

## Programmatic — `useVariants`

For chaining, async transitions, or driving variants from non-React code (event handlers, gesture callbacks, network responses), build a controller with `useVariants` and pass it through the `controller` prop:

```tsx
import { Motion, useVariants } from '@onlynative/inertia'

const variants = {
  resting: { scale: 1, opacity: 1 },
  loading: { scale: 0.96, opacity: 0.6 },
  done: { scale: 1.04, opacity: 1 },
} as const

export function SaveButton() {
  const controller = useVariants(variants, 'resting')

  async function save() {
    controller.transitionTo('loading')
    await api.save()
    controller.transitionTo('done')
  }

  return (
    <Motion.Pressable
      variants={variants}
      controller={controller}
      onPress={save}
      transition={{ type: 'spring' }}
      style={buttonStyles.button}
    />
  )
}
```

`useVariants(variants, initial?)` returns a `{ current, transitionTo, subscribe }` controller. `current` is the active key; `transitionTo(next)` re-applies the matching variant on every subscribed Motion primitive.

When both `controller` and `animate` are set on the same primitive, the controller wins. Don't mix them — the typed contract is "either drive imperatively or declaratively, not both".

## Variant transitions

`transition` resolves from the Motion primitive, not from each variant. A single transition on the wrapping primitive applies to every variant target:

```tsx
<Motion.View
  variants={variants}
  animate="open"
  transition={{
    opacity: { type: 'timing', duration: 200 },
    translateY: { type: 'spring' },
  }}
/>
```

Per-variant transitions land in v0.2; today, switch the wrapping primitive's `transition` based on `current` if you need it.
