import { MotionImage } from './Image'
import { MotionText } from './Text'
import { MotionView } from './View'

export { createMotionComponent } from './createMotionComponent'
export { MotionView, MotionText, MotionImage }

/**
 * The `Motion.*` namespace. Each property is a primitive with its style prop
 * inferred from the underlying RN component. There is no shared style fallback.
 */
export const Motion = {
  View: MotionView,
  Text: MotionText,
  Image: MotionImage,
} as const
