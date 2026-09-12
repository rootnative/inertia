import { Platform } from 'react-native'
import { READY_ATTRIBUTE } from './attributes'

let marked = false

/**
 * Tell the entrance guard that the bundle is running.
 *
 * Called from the mount effect of the first `Motion.*` that renders with an
 * animation prop. Mount is the right moment because it is the first point at
 * which the client has taken over from the server-rendered HTML — the same
 * event the consumer would otherwise have to signal by hand.
 *
 * It writes one attribute, once per document, and does nothing at all off web.
 * It is deliberately **not** a module-level side effect: `sideEffects: false`
 * in this package's `package.json` is load-bearing for tree-shaking, and an
 * import-time DOM write would make that declaration a lie.
 */
export function markInertiaReady(): void {
  if (marked || Platform.OS !== 'web') return
  if (typeof document === 'undefined') return
  marked = true
  document.documentElement.setAttribute(READY_ATTRIBUTE, 'true')
}

/** @internal — test-only hook to reset the once-per-document state. */
export function __resetInertiaReadyForTests(): void {
  marked = false
  if (typeof document !== 'undefined') {
    document.documentElement.removeAttribute(READY_ATTRIBUTE)
  }
}
