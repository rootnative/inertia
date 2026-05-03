import { Pressable } from 'react-native'
import { createMotionComponent } from './createMotionComponent'

/**
 * Animatable `Pressable`. The `gesture` prop's `pressed` sub-state hooks into
 * Pressable's native `onPressIn` / `onPressOut` via the factory's handler
 * composition, picking up touch slop and accessibility semantics for free.
 *
 * Note: the function-style `style={(state) => ...}` Pressable form is not
 * supported. Drive press-state styling through `gesture.pressed` instead.
 */
export const MotionPressable = createMotionComponent(Pressable)
