/**
 * Compile-time gate for `useInterpolatedStyle`'s map typing.
 *
 * The `InterpolatedStyleMap` type routes color-style keys to `string[]` stops
 * and numeric/transform keys to `number[]` stops. These assertions verify the
 * mismatch cases are compile errors — a color key given number stops, or a
 * numeric/transform key given color-string stops. They run under
 * `tsc --noEmit` (the typecheck CI step); the file is never rendered.
 */

import type { SharedValue } from 'react-native-reanimated'
import { useInterpolatedStyle } from '../values'

declare const progress: SharedValue<number>

export function InterpolatedStyleTypeProbe() {
  // Numeric keys take number stops.
  useInterpolatedStyle(progress, { opacity: [0, 1], height: [100, 40] })

  // Transform keys take number stops and lift into the transform array.
  useInterpolatedStyle(progress, { translateX: [20, 0], scale: [0.8, 1] })

  // Color keys take color-string stops.
  useInterpolatedStyle(progress, {
    backgroundColor: ['#fff', '#000'],
    borderColor: ['red', 'blue'],
  })

  // Mixed map: each key keeps its own stop type.
  useInterpolatedStyle(progress, {
    opacity: [0, 1],
    backgroundColor: ['#fff', '#000'],
    translateY: [20, 0],
  })

  // @ts-expect-error color stops are rejected on a numeric key
  useInterpolatedStyle(progress, { opacity: ['#fff', '#000'] })

  // @ts-expect-error color stops are rejected on a transform key
  useInterpolatedStyle(progress, { translateX: ['#fff', '#000'] })

  // @ts-expect-error number stops are rejected on a color key
  useInterpolatedStyle(progress, { backgroundColor: [0, 1] })

  // @ts-expect-error unknown keys are rejected
  useInterpolatedStyle(progress, { notAStyleKey: [0, 1] })

  return null
}
