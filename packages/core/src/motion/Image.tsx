import { Image } from 'react-native'
import { createMotionComponent } from './createMotionComponent'

/**
 * Animatable `Image`. Inherits `Image`'s prop surface, with `animate` /
 * `initial` / `exit` / `transition` typed against `ImageStyle` (so
 * `tintColor` is accepted on `animate` here, but rejected on `Motion.View`).
 */
export const MotionImage = createMotionComponent(Image)
