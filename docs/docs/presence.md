---
sidebar_position: 8
---

# Presence

`<Presence>` keeps a child mounted long enough to play its `exit` animation when it's removed from the tree. Half the noise of `<AnimatePresence>`, same role.

```tsx
import { Motion, Presence } from '@onlynative/inertia'

export function Toast({ visible }: { visible: boolean }) {
  return (
    <Presence>
      {visible ? (
        <Motion.View
          key="toast"
          initial={{ opacity: 0, translateY: 24 }}
          animate={{ opacity: 1, translateY: 0 }}
          exit={{ opacity: 0, translateY: 24 }}
          transition={{ type: 'spring', tension: 220, friction: 22 }}
          style={toastStyles.toast}
        />
      ) : null}
    </Presence>
  )
}
```

## How it works

`Presence` snapshots children that disappear from its `children` array, holds them in place, and waits for each to finish its exit animation before unmounting. It uses Reanimated's `entering` / `exiting` lifecycle for the underlying frames.

## Required: `key`

Every direct child of `<Presence>` must have an explicit `key`. Without one, React falls back to positional identity and removal looks like a prop change — nothing to mark exiting. In dev, keyless children produce a warning and are skipped.

## Tap-deaf exits

The moment a child starts its exit animation, Inertia merges `pointerEvents: 'none'` onto its style. Taps fall through to whatever's underneath instead of re-triggering an about-to-unmount node. This is the "two clicks to re-open the popover" bug from the prior art — by design, you only need one.

## Re-entry interrupts exit

If a key reappears in `children` while it was exiting, the in-flight exit animation interrupts back toward the `animate` values. The component instance persists across the round trip — no remount, no flicker.

## Multiple children

`Presence` handles lists too:

```tsx
<Presence>
  {items.map((item) => (
    <Motion.View
      key={item.id}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    />
  ))}
</Presence>
```

Each child's exit timing is independent — one row can finish exiting while another is still animating in.

## What can be a child?

Any component that consumes `usePresence()` and calls `safeToRemove()` when its exit completes. Every `Motion.*` primitive does this. Plain `View` / `Text` will linger in the snapshot once removed because nothing tells `Presence` they're done — pick a Motion primitive instead.

## Accessing presence state

Custom components can read presence state directly:

```tsx
import { usePresence } from '@onlynative/inertia'

function MyExitable() {
  const presence = usePresence()
  // presence is null when no <Presence> ancestor exists
  // presence?.isPresent flips false when the parent removes us
  // presence?.safeToRemove() once the exit animation finishes
}
```
