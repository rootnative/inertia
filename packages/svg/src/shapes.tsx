import { Circle, Line, Rect } from 'react-native-svg'
import { createMotionSvgComponent } from './createMotionSvgComponent'

/**
 * Animatable `<Circle>` from `react-native-svg`, built with
 * `createMotionSvgComponent`. Animatable dimensions: `cx`, `cy`, `r`,
 * `strokeWidth`, `strokeOpacity`, `fillOpacity`, `opacity`,
 * `strokeDashoffset` (numeric), `fill` / `stroke` (color), and
 * `strokeDasharray` (numeric array, length locked at mount).
 *
 * The canonical consumer is a circular progress ring — animate
 * `strokeDashoffset` against a static `strokeDasharray` of the circumference:
 *
 * @example
 * ```tsx
 * const CIRCUMFERENCE = 2 * Math.PI * 45
 *
 * <Svg viewBox="0 0 100 100">
 *   <MotionCircle
 *     cx={50} cy={50} r={45}
 *     stroke="#0ea5e9" strokeWidth={8} fill="none"
 *     strokeDasharray={[CIRCUMFERENCE]}
 *     strokeDashoffset={CIRCUMFERENCE}
 *     animate={{ strokeDashoffset: CIRCUMFERENCE * (1 - progress) }}
 *     transition={{ type: 'timing', duration: 300 }}
 *   />
 * </Svg>
 * ```
 */
export const MotionCircle = createMotionSvgComponent(Circle, {
  animatableProps: [
    'cx',
    'cy',
    'r',
    'strokeWidth',
    'strokeOpacity',
    'fillOpacity',
    'opacity',
    'strokeDashoffset',
  ],
  colorProps: ['fill', 'stroke'],
  arrayProps: ['strokeDasharray'],
})

/**
 * Animatable `<Rect>` from `react-native-svg`, built with
 * `createMotionSvgComponent`. Animatable dimensions: `x`, `y`, `width`,
 * `height`, `rx`, `ry`, `strokeWidth`, `strokeOpacity`, `fillOpacity`,
 * `opacity`, `strokeDashoffset` (numeric), `fill` / `stroke` (color), and
 * `strokeDasharray` (numeric array, length locked at mount).
 */
export const MotionRect = createMotionSvgComponent(Rect, {
  animatableProps: [
    'x',
    'y',
    'width',
    'height',
    'rx',
    'ry',
    'strokeWidth',
    'strokeOpacity',
    'fillOpacity',
    'opacity',
    'strokeDashoffset',
  ],
  colorProps: ['fill', 'stroke'],
  arrayProps: ['strokeDasharray'],
})

/**
 * Animatable `<Line>` from `react-native-svg`, built with
 * `createMotionSvgComponent`. Animatable dimensions: `x1`, `y1`, `x2`, `y2`,
 * `strokeWidth`, `strokeOpacity`, `opacity`, `strokeDashoffset` (numeric),
 * `stroke` (color), and `strokeDasharray` (numeric array, length locked at
 * mount).
 */
export const MotionLine = createMotionSvgComponent(Line, {
  animatableProps: [
    'x1',
    'y1',
    'x2',
    'y2',
    'strokeWidth',
    'strokeOpacity',
    'opacity',
    'strokeDashoffset',
  ],
  colorProps: ['stroke'],
  arrayProps: ['strokeDasharray'],
})
