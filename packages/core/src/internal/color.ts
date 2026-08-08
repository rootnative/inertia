/**
 * The one colour spelling Reanimated's animation drivers cannot accept.
 *
 * Reanimated dispatches an animation on the runtime shape of its **source**
 * value, and `isColor()` is the gate for the RGBA-channel path. That gate is
 * `processColorInitially(value) != null`, and Reanimated's colour-name table
 * (`Colors.ts`) maps `transparent` to `undefined` — every other CSS colour
 * name maps to a packed integer. So `'transparent'` is the single named colour
 * that reports **false**.
 *
 * A value that fails the gate but is still a string falls to the
 * prefix-number-suffix branch, which exists for values like `'100%'`. It runs
 * `parseFloat('transparent')` → `NaN`, animates that, and re-attaches the
 * prefix, so the slot fills with `'transparentNaN'`. Under `withTiming` the
 * animation still snaps to its target when the duration elapses, which hides
 * the fault; under `withSpring` — the library default — settling is decided by
 * comparisons against `NaN`, which are all false, so the animation runs
 * forever and the colour never appears.
 *
 * `'rgba(0, 0, 0, 0)'` is the same colour and passes the gate.
 *
 * This only applies to values handed to `withSpring` / `withTiming`.
 * `interpolateColor` parses `'transparent'` correctly, which is why the
 * gesture cascade, the shared-element carry, and `useShadow` are unaffected
 * and keep the consumer's own spelling.
 */
export const TRANSPARENT = 'rgba(0, 0, 0, 0)'

/**
 * Rewrite `'transparent'` to a spelling Reanimated recognises. Any other value
 * — a different colour, a number, a non-string — is returned untouched, by
 * reference, so this costs nothing on the overwhelmingly common path.
 */
export function normalizeAnimatableColor<T>(value: T): T | string {
  return value === 'transparent' ? TRANSPARENT : value
}

/**
 * Apply {@link normalizeAnimatableColor} across a whole `animate` target for a
 * colour key, including the sequence forms — a keyframe array whose entries are
 * either raw values or `{ to, ...transitionOverride }` step objects.
 *
 * Returns the input by reference when nothing needed rewriting, so an
 * unaffected target neither allocates nor breaks any identity a caller relies
 * on.
 */
export function normalizeAnimatableColorTarget<T>(target: T): T {
  if (typeof target === 'string') {
    return normalizeAnimatableColor(target) as T
  }
  if (!Array.isArray(target)) return target

  let changed = false
  const next = target.map((step) => {
    if (step === 'transparent') {
      changed = true
      return TRANSPARENT
    }
    if (
      step !== null &&
      typeof step === 'object' &&
      (step as { to?: unknown }).to === 'transparent'
    ) {
      changed = true
      return { ...(step as object), to: TRANSPARENT }
    }
    return step
  })
  return (changed ? next : target) as T
}
