import { MotionImage } from './Image'
import { MotionPressable } from './Pressable'
import { MotionScrollView } from './ScrollView'
import { MotionText } from './Text'
import { MotionView } from './View'

export { createMotionComponent } from './createMotionComponent'
export {
  MotionView,
  MotionText,
  MotionImage,
  MotionPressable,
  MotionScrollView,
}

/**
 * The `Motion.*` namespace. Each property is a primitive with its style prop
 * inferred from the underlying RN component. There is no shared style fallback.
 */
export const Motion = {
  View: MotionView,
  Text: MotionText,
  Image: MotionImage,
  Pressable: MotionPressable,
  ScrollView: MotionScrollView,
} as const
