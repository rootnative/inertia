---
sidebar_position: 5
description: Animatable Pressable — gesture.pressed hooks into onPressIn and onPressOut, inheriting touch slop and accessibility semantics.
---

# Motion.Pressable

Animatable `Pressable`. The `gesture.pressed` sub-state connects directly to the `onPressIn` and `onPressOut` of Pressable, so it gets the touch slop and the accessibility behavior of React Native at no cost.

```tsx
import { Motion } from '@rootnative/inertia'

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
import { MotionPressable } from '@rootnative/inertia/pressable'
```

## `style` must be a value, not a function

This is the **most common trap** when you come from the `Pressable` of React Native. That `Pressable` accepts a function form, `style={(state) => ...}`, which runs on every press to derive styles from the press, focus, and hover state. The `createAnimatedComponent` wrapper of Reanimated doesn't call it, so the function would be dropped with no message. So `Motion.Pressable`, and every other `Motion.*` primitive, **throws in dev** when `style` is a function.

```tsx
// ❌ Throws in dev. Drive press-state through `gesture` instead.
<Motion.Pressable
  style={({ pressed }) => [
    styles.button,
    pressed && styles.buttonPressed,
  ]}
/>

// ✅
<Motion.Pressable
  style={styles.button}
  gesture={{ pressed: { scale: 0.96, opacity: 0.85 } }}
/>
```

The throw is behind `__DEV__`, so a production build doesn't pay for the check. A production build would still drop the styles with no message, and that is why the check in dev matters. This applies to `style` only. A plain value, an array, and the output of `StyleSheet.create` all work. If you need a conditional style that `gesture` can't animate, compute it once in render and pass the resulting style array.

## Notes

- `gesture` is the only path. There is no separate pressable variant in the style of Moti. That is intentional.
- `gesture.focused` works for any focusable Pressable (for example, with `accessible`, on TV, or with keyboard focus on web). When the platform sends no focus events, native ignores it with no error.

See the full [gestures](../gestures) page for the sub-state priority and the type of the prop.
