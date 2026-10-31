import { TRANSPARENT } from '@rootnative/inertia'

/** The SVG paint keyword for "paint nothing". */
export const SVG_NONE = 'none'

/**
 * Map the SVG `none` keyword to a color that Reanimated accepts.
 *
 * Reanimated runs every `fill` and `stroke` in `animatedProps` through its
 * color processor on the UI thread, and that processor throws on `none`. An
 * uncaught UI-thread error aborts the app on native. `TRANSPARENT` paints
 * the same nothing.
 */
export function animatableColor(value: string): string {
  return value === SVG_NONE ? TRANSPARENT : value
}
