/**
 * `@rootnative/inertia-svg` — animatable SVG primitives for
 * `@rootnative/inertia`.
 *
 * v0.2 surface:
 * - `MotionPath` / `MotionSvg.Path` — animatable `<Path>` over
 *   `react-native-svg`. Supports path morphing on the `d` attribute (source
 *   and target must share the same command sequence) plus animatable
 *   `fill`, `stroke`, `strokeWidth`, `strokeOpacity`, `fillOpacity`,
 *   `opacity`, and `strokeDashoffset` with the same `initial` /
 *   `animate` / `transition` shape as the core `Motion.*` primitives.
 *
 * Additional shape primitives (`Circle`, `Rect`, `Line`, `Ellipse`) land in
 * a follow-up once the path morphing API is validated. Path normalization
 * (resampling between structurally different paths) is out of scope for
 * v0.2 — use structurally-compatible source/target paths and remount with
 * `key={...}` to switch shape.
 */
export { MotionPath } from './MotionPath'
export type { MotionPathProps } from './MotionPath'
export type {
  PathAnimate,
  PathPerPropertyTransition,
  PathStateShape,
  PathTransition,
} from './types'

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

/**
 * Namespace bundling every animatable SVG primitive. Use `MotionSvg.Path` for
 * autocomplete-friendly grouping or import `MotionPath` directly — both
 * point at the same component.
 */
export const MotionSvg = {
  Path: MotionPath,
} as const
