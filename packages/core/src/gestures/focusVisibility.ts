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
 * The web listeners attach lazily on first call (capture phase, so they run
 * before the focus event reaches the focused element) and stay installed for
 * the lifetime of the document. They are passive and idle-cheap; the cost is
 * one boolean read per `onFocus` dispatch.
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

function ensureInstalled(): void {
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
  ensureInstalled()
  return modality === 'keyboard'
}

/** @internal — test-only hook to reset module state between cases. */
export function __resetFocusVisibilityForTests(next: InputModality): void {
  modality = next
}
