---
sidebar_position: 6
description: Named animation states — define them once, then drive transitions by passing a key.
---

# Variants

A variant is a named animation state. Define the states once, then pass a key to move between them. The common case needs no hook.

## Declarative

```tsx
import { Motion } from '@rootnative/inertia'

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

The variant keys autocomplete on `animate`, and a typo is a compile error. You need no type annotation: TypeScript infers the keys of the map at the JSX call site. `as const` is optional. Add it only when you also want the variant _values_ readonly.

## Programmatic — `useVariants`

Use a controller when you chain states, await a transition, or set a variant from code outside React (an event handler, a gesture callback, a network response). Build the controller with `useVariants` and pass it through the `controller` prop:

```tsx
import { Motion, useVariants } from '@rootnative/inertia'

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

`useVariants(variants, initial?)` returns a `{ current, transitionTo }` controller. `current` is the active key. `transitionTo(next)` applies the matching variant on every Motion primitive that holds the controller. The controller also carries an internal `subscribe` for the primitives. `subscribe` is not part of the public contract.

When a primitive has both `controller` and `animate`, the controller wins. Don't mix them. The typed contract is: drive a primitive from a controller, or from `animate`, not both.

## Variant transitions

`transition` comes from the Motion primitive, not from each variant. One transition on the primitive applies to every variant target:

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

A different transition per variant target isn't supported. If you need that, switch the `transition` of the primitive on the active key.
