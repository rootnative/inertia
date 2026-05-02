import { View } from 'react-native'
import { createMotionComponent } from './createMotionComponent'

/**
 * Animatable `View`. Inherits `View`'s prop surface, with `animate` /
 * `initial` / `exit` / `transition` typed against `ViewStyle`.
 */
export const MotionView = createMotionComponent(View)
