/**
 * Default `duration` for a `timing` transition that does not set one, in ms.
 * Shared by the JS-thread resolver (`resolve.ts`) and the UI-thread builder
 * (`runtime.ts`) so the two paths cannot drift apart.
 */
export const DEFAULT_TIMING_DURATION = 250

/**
 * Default `duration` for a `timing` layout transition (`layout` prop and
 * `layoutId` shared-element legs), in ms. Layout moves cover more distance
 * than a property tween, so the default is longer than
 * `DEFAULT_TIMING_DURATION`.
 */
export const DEFAULT_LAYOUT_DURATION = 300
