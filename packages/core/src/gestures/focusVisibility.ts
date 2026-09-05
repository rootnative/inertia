import { Platform } from 'react-native'

/**
 * Input-modality tracker for the `focusVisible` gesture sub-state.
 *
 * Implements the W3C `:focus-visible` heuristic: a focus event counts as
 * "visible" only when the most recent user input was keyboard-driven. Mouse,
 * pointer, and touch events flip the modality to `'pointer'`; keyboard events
 * flip it back to `'keyboard'`.
 *
 * On native platforms there is no pointer-vs-keyboard distinction — focus
 * arrives via D-pad, screen reader, or hardware keyboard, all of which are
 * keyboard-equivalent — so `isFocusVisible()` is unconditionally `true`.
 *
 * The web listeners attach when the first component that tracks
 * `focusVisible` mounts (`installFocusVisibility`, called from a mount
 * effect), in the capture phase so they run before the focus event reaches
 * the focused element, and they stay installed for the lifetime of the
 * document. Mount-time installation is early enough: the click that focuses
 * a gesture-wired element can only land on an element that is already
 * mounted, so its `mousedown` is observed. The listeners are not attached at
 * import time — `@rootnative/inertia` declares `sideEffects: false`, and an
 * import-time listener would make that declaration false. They are passive
 * and idle-cheap; the cost is one boolean read per `onFocus` dispatch.
 */

type InputModality = 'keyboard' | 'pointer'

// Default to `'keyboard'` so a programmatic / autofocus that happens before
// any user input still draws a focus ring — matches the W3C polyfill default.
let modality: InputModality = 'keyboard'
let installed = false

function setKeyboard() {
  modality = 'keyboard'
}

function setPointer() {
  modality = 'pointer'
}

/**
 * Attach the document listeners that track input modality on web. Idempotent
 * and a no-op on native or without a `document`. Call it from a mount effect
 * of any component that reads `isFocusVisible()`, so the pointer event that
 * precedes the first focus is observed (see module doc above).
 * `isFocusVisible` also calls it as a safety net.
 */
export function installFocusVisibility(): void {
  if (installed) return
  if (Platform.OS !== 'web') return
  if (typeof document === 'undefined') return
  document.addEventListener('keydown', setKeyboard, true)
  document.addEventListener('mousedown', setPointer, true)
  document.addEventListener('pointerdown', setPointer, true)
  document.addEventListener('touchstart', setPointer, true)
  installed = true
}

/**
 * `true` if the next `onFocus` should be treated as "focus-visible" (keyboard
 * focus). On native, always `true`. On web, reflects the most recent user
 * input modality.
 */
export function isFocusVisible(): boolean {
  if (Platform.OS !== 'web') return true
  installFocusVisibility()
  return modality === 'keyboard'
}

/** @internal — test-only hook to reset module state between cases. */
export function __resetFocusVisibilityForTests(next: InputModality): void {
  modality = next
}
