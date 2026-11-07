---
sidebar_position: 8
description: Presence keeps a child mounted long enough to play its exit animation when it leaves the tree.
---

# Presence

`<Presence>` keeps a child mounted long enough to play its `exit` animation after you remove the child from the tree. It has the same role as `<AnimatePresence>` in Framer Motion, with a smaller API.

```tsx
import { Motion, Presence } from '@rootnative/inertia'

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

When a child disappears from the `children` array, `Presence` takes a snapshot of it and holds the snapshot in a JS-thread map. `Presence` unmounts the child after the child finishes its exit animation and calls `safeToRemove()`. `Presence` does **not** use the `entering` and `exiting` lifecycle of Reanimated. The exit frames are ordinary Motion animations that the `exit` prop of the child drives. That design lets an interrupted exit reverse smoothly when the child re-enters.

## Required: `key`

Every direct child of `<Presence>` must have an explicit `key`. Without a key, React uses the position as the identity, and a removal looks like a prop change. Then there is nothing to mark as exiting. `Presence` never renders a child with no key. A dev build also logs a warning. A production build drops the child with no message.

## Tap-deaf exits

When a child starts its exit animation, Inertia merges `pointerEvents: 'none'` into its style. A tap falls through to the element below. It doesn't start the node that is about to unmount again. In other libraries, this is the "two taps to open the popover again" defect. In Inertia you need one tap.

## Re-entry interrupts exit

If a key reappears in `children` while its child exits, the exit animation reverses toward the `animate` values. The component instance stays alive through the round trip, with no remount and no flicker.

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

Each child has its own exit timing. One row can finish its exit while another row still animates in.

An exiting child animates out **in place**. It keeps its slot among its siblings until `Presence` removes it, right after its nearest sibling that stays. When you delete the middle row of a list, that row fades where it is. The rows below it don't move up during the animation. A sibling that you add or reorder while a child exits goes around the exiting child. Several adjacent exiting children keep their order.

## Nested `Motion.*` children

An exiting child stays mounted until every `Motion.*` inside it finishes its exit. A nested `Motion.*` with no `exit` finishes at once, so it doesn't cut the exit of the child that holds it. A nested `Motion.*` with a longer `exit` holds the child until that exit ends.

```tsx
<Presence>
  {open ? (
    <Motion.View key="sheet" exit={{ translateY: 400 }}>
      {/* No `exit`: the sheet still slides out in full. */}
      <Motion.View
        animate={{ rotate: 360 }}
        transition={{ repeat: 'infinite' }}
      />
      {/* A shorter `exit`: it fades, and the sheet keeps sliding. */}
      <Motion.View
        exit={{ opacity: 0 }}
        transition={{ type: 'timing', duration: 100 }}
      />
    </Motion.View>
  ) : null}
</Presence>
```

So a component that animates on its own, such as a spinner or a skeleton, can go inside a sheet or a dialog with no `exit` of its own.

A custom component that calls `usePresence()` and then `safeToRemove()` removes the child at once. `safeToRemove()` doesn't wait for the `Motion.*` exits, so call it only after the whole exit finishes.

## A child with no `Motion.*` leaves at once

A departing child with no `Motion.*` and no `usePresence()` consumer has nothing to animate and nothing to wait for. `Presence` removes it at once, with no exit animation. So a loading placeholder in a plain `View` can swap for its content under one `<Presence>`:

```tsx
<Presence>
  {loading ? (
    <View key="loading">
      <Spinner />
    </View>
  ) : (
    <Motion.View
      key="content"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    />
  )}
</Presence>
```

The content fades in, and the placeholder is gone on the same frame. Give the placeholder a `Motion.View` with an `exit` when it must fade out.

## What can be a child?

Any element. A child animates its exit through a `Motion.*` primitive, or through a component that calls `usePresence()` and then `safeToRemove()` when its exit finishes. `Presence` removes a child with neither at once.

## Accessing presence state

A custom component can read the presence state:

```tsx
import { usePresence } from '@rootnative/inertia'

function MyExitable() {
  const presence = usePresence()
  // presence is null when no <Presence> ancestor exists
  // presence?.isPresent flips false when the parent removes us
  // presence?.safeToRemove() once the exit animation finishes
}
```
