/**
 * `@rootnative/inertia-svg` — animatable SVG primitives for
 * `@rootnative/inertia`.
 *
 * Surface:
 * - `MotionPath` / `MotionSvg.Path` — animatable `<Path>` over
 *   `react-native-svg`. Supports path morphing on the `d` attribute (source
 *   and target must share the same command sequence) plus animatable
 *   `fill`, `stroke`, `strokeWidth`, `strokeOpacity`, `fillOpacity`,
 *   `opacity`, and `strokeDashoffset` with the same `initial` /
 *   `animate` / `transition` shape as the core `Motion.*` primitives.
 * - `MotionCircle` / `MotionRect` / `MotionLine` (also on the `MotionSvg`
 *   namespace) — prebuilt animatable shapes with numeric, color, and
 *   `strokeDasharray` (array, length locked at mount) animation.
 * - `createMotionSvgComponent(Component, config)` — the factory behind the
 *   prebuilt shapes; wraps any `react-native-svg` element with declarative
 *   `initial` / `animate` / `transition` props (named transitions included).
 *
 * Path normalization (resampling between structurally different paths) is
 * out of scope — use structurally-compatible source/target paths and remount
 * with `key={...}` to switch shape.
 */
export { MotionPath } from './MotionPath'
export type { MotionPathProps } from './MotionPath'
export type {
  PathAnimate,
  PathPerPropertyTransition,
  PathStateShape,
  PathTransition,
} from './types'

export { createMotionSvgComponent } from './createMotionSvgComponent'
export type {
  CreateMotionSvgComponentConfig,
  MotionSvgComponentProps,
  SvgAnimate,
  SvgPerPropertyTransition,
  SvgTransition,
} from './createMotionSvgComponent'
export { MotionCircle, MotionLine, MotionRect } from './shapes'

export {
  parsePathD,
  templateOf,
  diffTemplate,
  flattenParams,
  serializePath,
  type PathSegment,
  type PathTemplate,
} from './path'

import { MotionPath } from './MotionPath'
import { MotionCircle, MotionLine, MotionRect } from './shapes'

/**
 * Namespace bundling every animatable SVG primitive. Use `MotionSvg.Path` /
 * `MotionSvg.Circle` for autocomplete-friendly grouping or import
 * `MotionPath` / `MotionCircle` directly — both point at the same component.
 */
export const MotionSvg = {
  Path: MotionPath,
  Circle: MotionCircle,
  Rect: MotionRect,
  Line: MotionLine,
} as const
