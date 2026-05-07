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

## `style` must be a value, not a function

This is the **#1 footgun** for users coming from RN's `Pressable` and the single most important thing to know about `Motion.Pressable`. RN's `Pressable` accepts a function-form `style={(state) => ...}` that re-runs on every press to derive styles from the press/focus/hover state. **`Motion.Pressable` silently drops the function form** — Reanimated's `createAnimatedComponent` wrapper does not invoke it, and you'll see no error.

```tsx
// ❌ Silently broken — the function is never called.
<Motion.Pressable
  style={({ pressed }) => [
    styles.button,
    pressed && styles.buttonPressed,
  ]}
/>

// ✅ Drive press-state through `gesture` instead.
<Motion.Pressable
  style={styles.button}
  gesture={{ pressed: { scale: 0.96, opacity: 0.85 } }}
/>
```

This applies to `style` only. Plain values, arrays, and `StyleSheet.create` outputs all work as expected. If you genuinely need conditional styles that aren't animatable through `gesture`, compute them once in render and pass the resulting style array.

## Notes

- `gesture` is the only path. There is no separate "Moti-style" pressable variant; this is intentional.
- `gesture.focused` works for any focusable Pressable (e.g. with `accessible` / TV / web keyboard focus). Native ignores it gracefully when the platform doesn't fire focus events.

See the full [gestures](../gestures) page for sub-state priority and the prop's typing.
