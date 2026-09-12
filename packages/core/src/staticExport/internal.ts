/**
 * What `createMotionComponent` needs from the static-export guard, and nothing
 * else.
 *
 * The factory imports from here rather than from `./index` so the guard's CSS
 * strings stay out of every primitive's bundle. They are read once, by an HTML
 * shell, and an app that never pre-renders should not carry them at all.
 */
export { ENTRANCE_DATA_SET_KEY } from './attributes'
export { markInertiaReady } from './ready'
