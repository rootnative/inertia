/**
 * `0.0.5` acceptance: `animate` accepts exactly the keys the runtime drives —
 * no more, no less.
 *
 * Two failure directions, and this file pins both:
 *
 *  - **Key accepted but not driven.** The defect this file was written for.
 *    Before `0.0.5`, `AnimateStyle<C>` mapped over the component's whole style
 *    surface, so `animate={{ paddingTop: 40 }}` compiled and was then dropped
 *    on the floor — no error, no warning, nothing in the rendered style. That
 *    contradicts the library's headline differentiator (see the first row of
 *    the sharp-edges table in `CLAUDE.md`), and a silent no-op is the worst
 *    possible failure mode for an animation library: the consumer's animation
 *    just doesn't happen and there is nothing to search for.
 *  - **Key driven but not accepted.** The mirror image, which a narrowing type
 *    can introduce: the runtime allocates a shared value and the worklet emits
 *    the key, but the public type rejects it, so it's unreachable.
 *
 * `AnimatableStyleKey` in `types.ts` and `ALL_KEYS` in `createMotionComponent`
 * are necessarily two separate declarations (one type, one runtime value), so
 * nothing but a test keeps them honest. The runtime half of that pairing lives
 * in `__tests__/animatable-keys.test.tsx`, which asserts every key in this file
 * actually lands in the rendered style — the two files together are the
 * contract. If you add a key to one, add it to the other three places.
 *
 * Mechanics are as `animate.test-d.tsx`: these run under `tsc --noEmit`, and an
 * `@ts-expect-error` that stops being an error fails the build as an unused
 * directive. Assertions are direct value-to-type assignments (not JSX) so
 * Prettier can't reflow an error off its directive line.
 */

import type { ComponentProps } from 'react'
import type { Image, Text, View } from 'react-native'
import type { AnimateStyle } from '../types'

type ViewAnimate = AnimateStyle<ComponentProps<typeof View>>
type TextAnimate = AnimateStyle<ComponentProps<typeof Text>>
type ImageAnimate = AnimateStyle<ComponentProps<typeof Image>>

// ─── Accepted: the keys added in 0.0.5 ──────────────────────────────────────

const _corners: ViewAnimate = {
  borderTopLeftRadius: 12,
  borderTopRightRadius: 12,
  borderBottomLeftRadius: 0,
  borderBottomRightRadius: 0,
}
const _borders: ViewAnimate = {
  borderWidth: 2,
  borderTopWidth: 1,
  borderRightWidth: 1,
  borderBottomWidth: 3,
  borderLeftWidth: 1,
}
const _insets: ViewAnimate = { top: 10, right: 20, bottom: 30, left: 40 }
const _padding: ViewAnimate = {
  padding: 8,
  paddingTop: 4,
  paddingRight: 4,
  paddingBottom: 4,
  paddingLeft: 4,
  paddingHorizontal: 6,
  paddingVertical: 6,
}
const _margin: ViewAnimate = {
  margin: 8,
  marginTop: 4,
  marginRight: 4,
  marginBottom: 4,
  marginLeft: 4,
  marginHorizontal: 6,
  marginVertical: 6,
}
const _flex: ViewAnimate = { flex: 1, flexGrow: 2, flexShrink: 0 }
const _stack: ViewAnimate = { zIndex: 3 }
const _gaps: ViewAnimate = { gap: 8, rowGap: 4, columnGap: 4 }

// Text metrics are TextStyle-only, so they land on Motion.Text and nowhere
// else. `fontSize` was the pre-0.0.5 canary: `animate.test-d.tsx` asserted it
// was *accepted* on Text while the runtime silently dropped it, so the two
// halves of the contract actively disagreed.
const _textMetrics: TextAnimate = {
  fontSize: 20,
  letterSpacing: 1.5,
  lineHeight: 28,
}

// Sequences and step objects work on the new keys like any other numeric key.
const _newKeySequence: ViewAnimate = { paddingTop: [0, 20, 10] }
const _newKeyStep: ViewAnimate = { top: { to: 40, type: 'timing' } }

// ─── Rejected: style keys the runtime does not drive ────────────────────────
//
// These are all real `ViewStyle` keys, which is the point — before 0.0.5 every
// one of them typechecked. A key belongs here when animating it is either
// meaningless (`position`, `overflow`) or has no numeric identity to rest at
// (`minWidth`, `aspectRatio`; see the `DEFAULT_RESTING` note in
// `createMotionComponent`).

// @ts-expect-error alignItems is not animatable — enum-valued, no interpolation
const _rejAlignItems: ViewAnimate = { alignItems: 'center' }
// @ts-expect-error position is not animatable — enum-valued
const _rejPosition: ViewAnimate = { position: 'absolute' }
// @ts-expect-error overflow is not animatable — enum-valued
const _rejOverflow: ViewAnimate = { overflow: 'hidden' }
// @ts-expect-error flexDirection is not animatable — enum-valued
const _rejFlexDir: ViewAnimate = { flexDirection: 'row' }
// @ts-expect-error minWidth has no numeric resting identity (see DEFAULT_RESTING)
const _rejMinWidth: ViewAnimate = { minWidth: 10 }
// @ts-expect-error maxHeight has no numeric resting identity
const _rejMaxHeight: ViewAnimate = { maxHeight: 100 }
// @ts-expect-error aspectRatio has no numeric resting identity
const _rejAspect: ViewAnimate = { aspectRatio: 1.5 }
// @ts-expect-error display is not animatable — enum-valued
const _rejDisplay: ViewAnimate = { display: 'flex' }

// ─── Per-primitive gating survives the narrowing ────────────────────────────
//
// The narrowing is an *intersection* with the component's own style keys, not a
// replacement for it, so every pre-0.0.5 per-primitive rule still holds.

// @ts-expect-error fontSize is TextStyle-only and must stay rejected on View
const _viewRejectsFontSize: ViewAnimate = { fontSize: 20 }
// @ts-expect-error letterSpacing is TextStyle-only and must stay rejected on View
const _viewRejectsLetterSpacing: ViewAnimate = { letterSpacing: 1 }
// @ts-expect-error tintColor is ImageStyle-only and must stay rejected on View
const _viewRejectsTintColor: ViewAnimate = { tintColor: '#0a84ff' }
// @ts-expect-error fontSize is TextStyle-only and must stay rejected on Image
const _imageRejectsFontSize: ImageAnimate = { fontSize: 20 }

// Silence "declared but never read" — these exist purely as type assertions.
export type _AnimatableKeyAssertions = [
  typeof _corners,
  typeof _borders,
  typeof _insets,
  typeof _padding,
  typeof _margin,
  typeof _flex,
  typeof _stack,
  typeof _gaps,
  typeof _textMetrics,
  typeof _newKeySequence,
  typeof _newKeyStep,
  typeof _rejAlignItems,
  typeof _rejPosition,
  typeof _rejOverflow,
  typeof _rejFlexDir,
  typeof _rejMinWidth,
  typeof _rejMaxHeight,
  typeof _rejAspect,
  typeof _rejDisplay,
  typeof _viewRejectsFontSize,
  typeof _viewRejectsLetterSpacing,
  typeof _viewRejectsTintColor,
  typeof _imageRejectsFontSize,
]
