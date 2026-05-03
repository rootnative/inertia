import { ScrollView } from 'react-native'
import { createMotionComponent } from './createMotionComponent'

/**
 * Animatable `ScrollView`. Animations apply to the scroll container itself —
 * useful for entrance transforms or fades on the whole list. Scroll-position
 * driven animation (`useScroll`) lands in the values layer.
 */
export const MotionScrollView = createMotionComponent(ScrollView)
