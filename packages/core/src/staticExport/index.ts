/**
 * `@rootnative/inertia/static-export` — the web static-export / SSR guard.
 *
 * A separate subpath on purpose. Everything here is web-only and is read once,
 * by an HTML shell, so none of it belongs in the bundle of an app that never
 * pre-renders. The root entry does not re-export it.
 */
export { entranceGuardCss, entranceGuardNoscriptCss } from './guardCss'
export { ENTRANCE_ATTRIBUTE, READY_ATTRIBUTE } from './attributes'
export type { EntranceGuardOptions } from './types'
