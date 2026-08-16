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
import type { ImageStyle, StyleProp, TextStyle, ViewStyle } from 'react-native'
import { useInterpolatedStyle } from '../values'

declare const progress: SharedValue<number>
declare const base: ViewStyle

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

/**
 * The return type narrows to the style family the map's keys belong to.
 *
 * Reanimated's `useAnimatedStyle` resolves to `DefaultStyle`
 * (`ViewStyle | ImageStyle | TextStyle`). That union is rejected inside a
 * `StyleProp<ViewStyle>` array — every member is checked there, and `TextStyle`
 * fails on `cursor` — so returning it forced consumers to cast at the call
 * site. These assertions pin both directions: the right family is accepted, and
 * a foreign key is still rejected.
 */
export function InterpolatedStyleReturnProbe() {
  // Transform + opacity in a style array — the shape that forced the cast.
  const card = useInterpolatedStyle(progress, {
    scale: [0.84, 1, 0.84],
    opacity: [0.45, 1, 0.45],
    translateY: [18, 0, 18],
  })
  const viewStyle: StyleProp<ViewStyle> = [base, card]

  // Text-metric keys satisfy a TextStyle slot.
  const label = useInterpolatedStyle(progress, {
    fontSize: [12, 16],
    letterSpacing: [0, 1],
  })
  const textStyle: StyleProp<TextStyle> = [label]

  // `tintColor` is Image-only.
  const image = useInterpolatedStyle(progress, { tintColor: ['#fff', '#000'] })
  const imageStyle: StyleProp<ImageStyle> = [image]

  // A key shared by View and Text satisfies either slot.
  const shared = useInterpolatedStyle(progress, {
    backgroundColor: ['#fff', '#000'],
  })
  const sharedAsView: StyleProp<ViewStyle> = [shared]
  const sharedAsText: StyleProp<TextStyle> = [shared]

  // @ts-expect-error a text-only fragment does not satisfy a ViewStyle slot
  const wrong: StyleProp<ViewStyle> = [label]

  return [viewStyle, textStyle, imageStyle, sharedAsView, sharedAsText, wrong]
}
