---
sidebar_position: 5
---

# Motion.Pressable

Animatable `Pressable`. The `gesture.pressed` sub-state hooks directly into Pressable's `onPressIn` / `onPressOut`, picking up touch slop and accessibility semantics from React Native for free.

```tsx
import { Motion } from '@onlynative/inertia'

export function PrimaryButton({ onPress }: { onPress: () => void }) {
  return (
    <Motion.Pressable
      onPress={onPress}
      gesture={{
        pressed: { scale: 0.96, opacity: 0.85 },
        focused: { scale: 1.02 },
      }}
      transition={{ type: 'spring', tension: 320, friction: 22 }}
      style={buttonStyles.button}
    />
  )
}
```

## Tree-shaken import

```ts
import { MotionPressable } from '@onlynative/inertia/pressable'
```

## Notes

- The function-style `style={(state) => ...}` Pressable form is **not** supported. Drive press-state styling through `gesture.pressed` instead — that's what the prop is for.
- `gesture` is the only path. There is no separate "Moti-style" pressable variant; this is intentional.
- `gesture.focused` works for any focusable Pressable (e.g. with `accessible` / TV / web keyboard focus). Native ignores it gracefully when the platform doesn't fire focus events.

See the full [gestures](../gestures) page for sub-state priority and the prop's typing.
