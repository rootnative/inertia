/**
 * Compile-time gate for variant-key narrowing on `animate`.
 *
 * CLAUDE.md Principle 5 / line 43: "Variant string keys must autocomplete on
 * `animate`." That requires the `variants` map to be inferred at the JSX call
 * site and `animate`'s string form to be narrowed to its keys — so a key typo
 * is a type error, not a silent runtime no-op. These assertions run under
 * `tsc --noEmit` (the typecheck CI step); if a `@ts-expect-error` here stops
 * being an error, tsc fails with "Unused '@ts-expect-error' directive" and the
 * differentiator has regressed.
 *
 * Unlike `animate.test-d.tsx`, these MUST mount JSX: the narrowing depends on
 * `V` being inferred from the `variants` prop at the call site, which only
 * happens through the generic component call signature.
 */

import { Motion } from '../motion'

const variants = {
  open: { opacity: 1, translateY: 0 },
  closed: { opacity: 0, translateY: 100 },
} as const

// ─── Variant key narrowing ──────────────────────────────────────────────────

// A declared key is accepted (and `open` / `closed` autocomplete here).
const _acceptsKnownKey = <Motion.View variants={variants} animate="open" />
const _acceptsOtherKey = <Motion.View variants={variants} animate="closed" />

// A typo'd key is a compile error rather than a silent no-op.
// @ts-expect-error 'opne' is not a key of `variants`
const _rejectsTypoKey = <Motion.View variants={variants} animate="opne" />

// The style-object form still works alongside `variants` (escape hatch for a
// one-off target that isn't a named state).
const _acceptsStyleObject = (
  <Motion.View variants={variants} animate={{ opacity: 0.5 }} />
)

// `as const` is NOT required — an inline object literal narrows just as well.
const inlineVariants = { a: { opacity: 1 }, b: { opacity: 0 } }
const _inlineVariantsNarrow = (
  <Motion.View variants={inlineVariants} animate="a" />
)
const _inlineVariantsReject = (
  // @ts-expect-error 'c' is not a key of the inline variants map
  <Motion.View variants={inlineVariants} animate="c" />
)

// ─── No variants → string stays open (back-compat) ──────────────────────────

// Without `variants`, the string form is unconstrained, so this must NOT error
// (the variant-less call site is unchanged by the narrowing machinery).
const _noVariantsAnyString = <Motion.View animate="whatever" />
const _noVariantsStyleObject = <Motion.View animate={{ translateX: 10 }} />

// Silence "declared but never read" — these exist purely as type assertions.
export type _VariantTypeAssertions = [
  typeof _acceptsKnownKey,
  typeof _acceptsOtherKey,
  typeof _rejectsTypoKey,
  typeof _acceptsStyleObject,
  typeof _inlineVariantsNarrow,
  typeof _inlineVariantsReject,
  typeof _noVariantsAnyString,
  typeof _noVariantsStyleObject,
]
