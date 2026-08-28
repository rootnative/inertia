---
sidebar_position: 9
description: Stagger gives each child a delay derived from its position, so a list entrance cascades without every child computing index * ms.
---

# Stagger

`<Stagger>` gives each of its children an animation delay derived from the child's position, so a list entrance cascades without every child computing `index * ms` itself. The parent owns the timing — the ordering data lives where the order is decided.

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

Child `i` (in render order) receives a delay of `delay + i * interval` milliseconds, applied to the declarative animations of every `Motion.*` primitive in that child's subtree — the mount animation (`initial` → `animate`) and any later `animate` change. `<Stagger>` renders no host view of its own, only per-child context.

## Props

| Prop       | Type                | Default   | Meaning                                                               |
| ---------- | ------------------- | --------- | --------------------------------------------------------------------- |
| `interval` | `number`            | required  | Milliseconds between consecutive children.                            |
| `delay`    | `number`            | `0`       | Base delay added to every child, so the whole cascade can start late. |
| `from`     | `'first' \| 'last'` | `'first'` | Which end of the list starts the cascade. `'last'` reverses it.       |
| `enabled`  | `boolean`           | `true`    | Turn the stagger off in one place — every child gets a delay of `0`.  |

## Why the parent owns the timing

The per-child alternative — `transition={{ delay: index * 60 }}` on each child — has two structural problems this component removes:

- **The index is per-child state.** A list that filters, reverses, or reorders staggers from stale positions unless every child guards its own delay. `<Stagger>` re-derives every delay from the current render order on every render.
- **The cascade can't be turned off in one place.** The common requirement is "cascade in, but snap out together". Pass `enabled={revealed}` and the hide direction animates with no delays, while the reveal cascades.

## What the delay applies to

The stagger delay wraps the child's **declarative animations** — everything driven through `animate`, including the initial mount. It composes with the child's own `transition.delay` (the two add). It deliberately does **not** apply to:

- **`gesture` sub-states.** Press and focus feedback delayed by list position would read as lag, not choreography.
- **`<Presence>` exits.** An exit delayed by position holds the unmount hostage to the cascade. Exits run on their own timing; use `enabled` if you want the hide direction to snap together.
- **Reduced motion.** When `<MotionConfig reducedMotion>` gates a subtree, values snap immediately — a deferred snap is still motion choreography, which is what the user asked to turn off.

## Details worth knowing

- **Positions come from render order after filtering.** `null`, `undefined`, and boolean children are dropped before positions are assigned, so a conditional child leaves no hole in the cascade.
- **The delay reaches nested primitives.** Each child slot gets its own provider, so a `Motion.View` anywhere inside child `i`'s subtree inherits child `i`'s delay — a list row's inner animated pieces cascade with their row.
- **A delay change alone re-triggers nothing.** The delay is read when an animation starts. Changing `interval` / `from` / `enabled` affects the next animation, not in-flight ones.
- **Custom animated components can participate.** `useStaggerDelay()` returns the delay assigned to the current child slot (`0` outside a `<Stagger>`); add it to the delay of whatever you resolve through `resolveTransition` / `resolveAnimatableValue`.

## Nesting

Nested `<Stagger>`s don't sum — the nearest ancestor wins, exactly like any React context. Give an inner list its own `<Stagger>` and its children cascade relative to that list.
