/**
 * The two DOM attributes the static-export guard is built on. They are shared
 * by the code that writes them (`Motion.*`, on web) and the CSS that reads
 * them (`entranceGuardCss`), so the marker and the rule that reveals it can
 * never drift apart — which is exactly what went wrong when both halves lived
 * in the consumer's app.
 */

/**
 * Written by every `Motion.*` on web that carries an `initial` prop. Those are
 * the elements a static export bakes at a pre-animation value.
 *
 * The name is the `data-` attribute as it appears in HTML. React Native for
 * Web builds it from the `dataSet` prop's key, so the two spellings differ:
 * `dataSet={{ entrance: 'true' }}` renders as `data-entrance="true"`.
 */
export const ENTRANCE_ATTRIBUTE = 'data-entrance'

/** The `dataSet` key that produces {@link ENTRANCE_ATTRIBUTE}. */
export const ENTRANCE_DATA_SET_KEY = 'entrance'

/**
 * Stamped on `<html>` by the first `Motion.*` that mounts on web. Its presence
 * means the bundle ran, so the guard below must stand down.
 *
 * Without this signal the fallback would fire on every page, including pages
 * where the animation ran perfectly — and a CSS animation outranks an inline
 * style, so at the timeout it would reveal every element still deliberately
 * hidden: an exit mid-flight, a gesture layer resting at zero opacity, a
 * variant that is closed. The guard has to be able to tell "the JavaScript
 * never arrived" from "the JavaScript decided this should be hidden".
 */
export const READY_ATTRIBUTE = 'data-inertia-ready'
