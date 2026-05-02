import { Text } from 'react-native'
import { createMotionComponent } from './createMotionComponent'

/**
 * Animatable `Text`. Inherits `Text`'s prop surface, with `animate` /
 * `initial` / `exit` / `transition` typed against `TextStyle`.
 */
export const MotionText = createMotionComponent(Text)
