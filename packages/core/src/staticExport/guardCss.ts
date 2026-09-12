import { ENTRANCE_ATTRIBUTE, READY_ATTRIBUTE } from './attributes'
import { type EntranceGuardOptions } from './types'

/** The animation name the guard defines. Namespaced so it cannot collide. */
const KEYFRAMES = 'inertia-entrance-guard'

/** How long to wait for the bundle before revealing the page anyway. */
const DEFAULT_TIMEOUT_MS = 4000

/**
 * CSS that reveals every entrance-marked element when the bundle never runs.
 *
 * ## The problem it solves
 *
 * A static export (`expo export`, or any server pre-render) renders the tree
 * on a server and writes the result into HTML. `Motion.*` renders at its
 * `initial` values, so an element that animates in from `opacity: 0` ships
 * with `opacity: 0` in its own `style` attribute. That is correct while the
 * bundle loads and takes over. It is a **blank page** for a visitor whose
 * bundle fails, who is on a connection that drops it, or who blocks scripts.
 *
 * Nothing in the framework catches this: the build succeeds, the HTML is
 * valid, and every automated check passes. It is visible only to a human who
 * loads the page with JavaScript off.
 *
 * ## How to use it
 *
 * Put the returned string in a `<style>` tag in the HTML shell — for Expo
 * Router that is `app/+html.tsx` — and the `noscript` string in a `<style>`
 * inside `<noscript>`:
 *
 * ```tsx
 * import {
 *   entranceGuardCss,
 *   entranceGuardNoscriptCss,
 * } from '@rootnative/inertia/static-export'
 *
 * export default function Root({ children }: PropsWithChildren) {
 *   return (
 *     <html lang="en">
 *       <head>
 *         <style dangerouslySetInnerHTML={{ __html: entranceGuardCss() }} />
 *         <noscript>
 *           <style
 *             dangerouslySetInnerHTML={{ __html: entranceGuardNoscriptCss }}
 *           />
 *         </noscript>
 *       </head>
 *       <body>{children}</body>
 *     </html>
 *   )
 * }
 * ```
 *
 * There is nothing to add per element. `Motion.*` writes the marker itself on
 * web whenever `initial` is set, and stands the guard down on mount.
 *
 * ## What it reveals to
 *
 * `opacity: 1` and `transform: none` — the resting state of the overwhelming
 * majority of entrances. An element that animates **to** a non-default opacity
 * or a permanent transform is revealed at the default instead of its real
 * target. That is a deliberate trade: the fallback's only job is to make the
 * content readable, and it runs only on a page where no animation will ever
 * run.
 *
 * @param options.timeoutMs How long to wait before revealing. Default 4000.
 */
export function entranceGuardCss(options?: EntranceGuardOptions): string {
  const timeout = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS

  return `@keyframes ${KEYFRAMES} {
  to { opacity: 1; transform: none; }
}
html:not([${READY_ATTRIBUTE}]) [${ENTRANCE_ATTRIBUTE}] {
  animation: ${KEYFRAMES} 0s ${timeout}ms forwards;
}
`
}

/**
 * CSS for a `<noscript>` block: reveal every marked element at once.
 *
 * With no script there is nothing to wait for, so holding the visitor for the
 * timeout would be pointless. `!important` is required and not defensive — a
 * static export writes each resting value into the element's own `style`
 * attribute, which outranks a plain rule in a stylesheet.
 */
export const entranceGuardNoscriptCss = `[${ENTRANCE_ATTRIBUTE}] {
  opacity: 1 !important;
  transform: none !important;
}
`
