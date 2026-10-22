import { MotionFlatList } from './FlatList'
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
  MotionFlatList,
}

/**
 * The `Motion.*` namespace. Each property is a primitive with its style prop
 * inferred from the underlying RN component. There is no shared style fallback.
 */
// The annotation is required. React Native 0.88 declares `Image` through a
// module it does not re-export by name, so an inferred `Motion` type cannot
// be written in the emitted `.d.ts` (TS2742).
export const Motion: {
  readonly View: typeof MotionView
  readonly Text: typeof MotionText
  readonly Image: typeof MotionImage
  readonly Pressable: typeof MotionPressable
  readonly ScrollView: typeof MotionScrollView
  readonly FlatList: typeof MotionFlatList
} = {
  View: MotionView,
  Text: MotionText,
  Image: MotionImage,
  Pressable: MotionPressable,
  ScrollView: MotionScrollView,
  FlatList: MotionFlatList,
}
