---
sidebar_position: 9
description: Stagger gives each child a delay derived from its position, so a list entrance cascades without every child computing index * ms.
---

# Stagger

`<Stagger>` gives each child an animation delay that comes from the position of the child. A list entrance then cascades, and no child computes `index * ms` itself. The parent owns the timing, because the parent decides the order.

```tsx
import { Motion, Stagger } from '@rootnative/inertia'

export function GiftList({ revealed, gifts }: Props) {
  return (
    <Stagger interval={60} enabled={revealed}>
      {gifts.map((gift) => (
        <Motion.View
          key={gift.id}
          animate={{
            opacity: revealed ? 1 : 0,
            translateY: revealed ? 0 : 16,
          }}
          transition={{ type: 'spring', tension: 220, friction: 20 }}
        />
      ))}
    </Stagger>
  )
}
```

Child `i` (in render order) gets a delay of `delay + i * interval` milliseconds. The delay applies to the declarative animations of every `Motion.*` primitive in the subtree of that child: the mount animation (`initial` to `animate`) and each later `animate` change. `<Stagger>` renders no host view of its own, only a context for each child.

## Props

| Prop       | Type                | Default   | Meaning                                                               |
| ---------- | ------------------- | --------- | --------------------------------------------------------------------- |
| `interval` | `number`            | required  | Milliseconds between consecutive children.                            |
| `delay`    | `number`            | `0`       | Base delay added to every child, so the whole cascade can start late. |
| `from`     | `'first' \| 'last'` | `'first'` | Which end of the list starts the cascade. `'last'` reverses it.       |
| `enabled`  | `boolean`           | `true`    | Turn the stagger off in one place — every child gets a delay of `0`.  |

## Why the parent owns the timing

The alternative, `transition={{ delay: index * 60 }}` on each child, has two structural problems. This component removes both:

- **The index is per-child state.** A list that filters, reverses, or reorders staggers from stale positions, unless every child guards its own delay. `<Stagger>` computes every delay again from the current render order on every render.
- **You can't turn the cascade off in one place.** The common requirement is "cascade in, but snap out together". Pass `enabled={revealed}`. The hide direction then animates with no delays, while the reveal cascades.

## What the delay applies to

The stagger delay wraps the **declarative animations** of the child: everything that `animate` drives, including the initial mount. It adds to the own `transition.delay` of the child. The delay does **not** apply to:

- **`gesture` sub-states.** Press and focus feedback with a delay from the list position would look like lag, not like choreography.
- **`<Presence>` exits.** An exit with a delay from the position would hold the unmount until the cascade ends. Exits run on their own timing. Use `enabled` if you want the hide direction to snap together.
- **Reduced motion.** When `<MotionConfig reducedMotion>` gates a subtree, values snap at once. A delayed snap is still motion choreography, and that is what the user asked to turn off.

## Details to know

- **Positions come from the render order after filtering.** `<Stagger>` drops `null`, `undefined`, and boolean children before it assigns positions, so a conditional child leaves no hole in the cascade.
- **The delay reaches nested primitives.** Each child slot gets its own provider, so a `Motion.View` anywhere inside the subtree of child `i` inherits the delay of child `i`. The inner animated parts of a list row cascade with their row.
- **A delay change alone starts nothing.** Inertia reads the delay when an animation starts. A change of `interval`, `from`, or `enabled` affects the next animation, not an animation in flight.
- **A custom animated component can take part.** `useStaggerDelay()` returns the delay of the current child slot (`0` outside a `<Stagger>`). Add it to the delay of whatever you resolve through `resolveTransition` or `resolveAnimatableValue`.

## Nesting

Nested `<Stagger>` components don't add up. The nearest ancestor wins, the same as any React context. Give an inner list its own `<Stagger>`, and its children cascade relative to that list.
