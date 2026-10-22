import { Image } from 'react-native'
import type { MotionComponent } from '../types'
import { createMotionComponent } from './createMotionComponent'

/**
 * Animatable `Image`. Inherits `Image`'s prop surface, with `animate` /
 * `initial` / `exit` / `transition` typed against `ImageStyle` (so
 * `tintColor` is accepted on `animate` here, but rejected on `Motion.View`).
 */
// The annotation is required. React Native 0.88 declares `Image` through a
// module it does not re-export by name, so the inferred type cannot be
// written in the emitted `.d.ts` (TS2742).
export const MotionImage: MotionComponent<typeof Image> =
  createMotionComponent(Image)
