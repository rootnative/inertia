import { Platform } from 'react-native'

/**
 * Input-modality tracker for the `focusVisible` gesture sub-state.
 *
 * On web, the browser decides first. A focus handler passes its event, and
 * when the target holds focus, `target.matches(':focus-visible')` is the
 * answer. The browser knows cases that no input tracker sees: after a click
 * that focuses nothing, Chromium shows the focus that a script moves next.
 *
 * The W3C `:focus-visible` heuristic is the fallback, for a call with no
 * event, a dispatched focus event that moved no focus, and a browser that
 * throws on the selector: a focus counts as "visible" only when the most
 * recent user input was keyboard-driven. Mouse, pointer, and touch events
 * flip the modality to `'pointer'`; keyboard events flip it back to
 * `'keyboard'`, except a Meta, Control, or Alt chord, as in the W3C polyfill.
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
 * and idle-cheap; the cost per `onFocus` dispatch is two selector matches at
 * most and one boolean read.
 */

type InputModality = 'keyboard' | 'pointer'

interface MatchableTarget {
  matches(selector: string): boolean
}

// Default to `'keyboard'` so a programmatic / autofocus that happens before
// any user input still draws a focus ring — matches the W3C polyfill default.
let modality: InputModality = 'keyboard'
let installed = false

function setKeyboard(event: KeyboardEvent) {
  // A chord such as ⌘K is pressed beside the mouse, so it is not keyboard
  // navigation. Chromium does not count it either.
  if (event.metaKey || event.ctrlKey || event.altKey) return
  modality = 'keyboard'
}

function setPointer() {
  modality = 'pointer'
}

function isMatchable(target: unknown): target is MatchableTarget {
  return (
    typeof target === 'object' &&
    target !== null &&
    typeof (target as { matches?: unknown }).matches === 'function'
  )
}

function browserFocusVisible(event: unknown): boolean | undefined {
  const target = (event as { target?: unknown } | null | undefined)?.target
  if (!isMatchable(target)) return undefined
  try {
    // A dispatched focus event moves no focus, and the browser then answers
    // `false` whatever the input was. Only a focused target gets its answer.
    if (!target.matches(':focus')) return undefined
    return target.matches(':focus-visible')
  } catch {
    // A browser without `:focus-visible` throws a SyntaxError.
    return undefined
  }
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
 * `true` if this focus should show a focus ring. On native, always `true`.
 * On web, pass the focus event: when its target holds focus, the browser's
 * `:focus-visible` decides. Otherwise the most recent input modality
 * decides.
 */
export function isFocusVisible(event?: unknown): boolean {
  if (Platform.OS !== 'web') return true
  installFocusVisibility()
  return browserFocusVisible(event) ?? modality === 'keyboard'
}

/** @internal — test-only hook to reset module state between cases. */
export function __resetFocusVisibilityForTests(next: InputModality): void {
  modality = next
}
