// Bundle-size baselines + regression guard. Phase-1 acceptance criterion in
// CLAUDE.md: "Bundle-size baseline for a Motion.View-only import is
// recorded." That baseline lives here.
//
// Peer deps (react, react-native, react-native-reanimated) are
// bundle-size-invisible because consumers provide them — `ignore` keeps the
// reported figure honest.
//
// Limits sit ~25% above the recorded baseline to absorb dependency-update
// noise without alerting on every patch. When a real change pushes past a
// limit, decide whether to tighten or accept it; don't silently raise the
// cap. Record any baseline shift here when you do.
//
// ── Recorded baselines, brotlied + minified, 2026-07-26, `boxShadow` on the
//    `animate` surface (unreleased, headed for `0.0.4`) ──
//   Motion.View subpath        8.24 kB   (was 6.63)
//   Motion.Text subpath        8.23 kB   (was 6.64)
//   Motion.Image subpath       8.23 kB   (was 6.64)
//   Motion.Pressable subpath   8.23 kB   (was 6.63)
//   Motion.ScrollView subpath  8.24 kB   (was 6.66)
//   Full namespace (root)     11.44 kB   (was 10.62)
//   MotionView (barrel-shaken) 8.07 kB   (was 6.50)
//   MotionText (barrel-shaken) 8.07 kB   (was 6.49)
//   MotionImage (barrel-shaken)8.06 kB   (was 6.49)
//   Testing helpers              223 B   (unchanged)
//
// That is +1.61 kB (+24%) per primitive subpath for one animatable property,
// and the limits below are raised deliberately to match — not to make a red
// build green. Where it goes, measured by building with each piece removed:
//
//   ~0.79 kB  `internal/boxShadow.ts` entering the primitive subpaths. It was
//             already in the root entry (via `useShadow`), which is why the
//             root grew only +0.82 kB — half the subpath delta.
//   ~0.82 kB  factory glue: the JS-thread endpoint normalizer, the drive path,
//             the emitting worklet branch, the static-`inset` slot.
//
// Alternatives that were measured and rejected: accepting only the structured
// `BoxShadowValue[]` form on `animate` (dropping CSS-string parsing from the
// factory) lands at 7.86 kB — it recovers just 0.40 kB, and costs the
// design-token ergonomic that motivated the parser in the first place. The
// remaining lever is real work, not a tweak: splitting the factory's
// gesture / variants / sequence / shadow paths into lazily-reached chunks, as
// the note at the bottom of this comment has always suggested.
//
// The previous baselines here were dated 2026-05-11 and read ~9.7 kB per
// subpath — roughly 3 kB above reality, so the comment had been actively
// misleading for two releases. Re-record whenever you touch this file.
//
// The limits were once left at 13/14 kB while the bundle shrank to ~6.6 kB,
// which is ~2x headroom — enough for the guard to sleep through a doubling in
// size. They stay pinned to the ~25% band this file has always claimed.
//
// All subpath / barrel-shaken entries collapse onto the shared
// `createMotionComponent` factory (~8.1 kB). That factory carries the
// per-key resolver, gesture composition, variants, sequences, repeat,
// Presence integration, callback dispatch, color/transform/shadow handling,
// and reduced-motion plumbing — i.e. the work that lets a consumer write
// `<Motion.View animate={...} />` without touching Reanimated directly.
// Cutting it further requires real refactoring (e.g. splitting the
// gesture/variants/sequence paths into lazy chunks); a one-line change
// shouldn't move these numbers.

const PEERS_IGNORE = [
  'react',
  'react/jsx-runtime',
  'react-native',
  'react-native-reanimated',
]

/** @type {import('size-limit').SizeLimitConfig} */
module.exports = [
  {
    name: 'Motion.View (subpath) — @rootnative/inertia/view',
    path: 'dist/motion/View.mjs',
    ignore: PEERS_IGNORE,
    limit: '10.3 kB',
  },
  {
    name: 'Motion.Text (subpath) — @rootnative/inertia/text',
    path: 'dist/motion/Text.mjs',
    ignore: PEERS_IGNORE,
    limit: '10.3 kB',
  },
  {
    name: 'Motion.Image (subpath) — @rootnative/inertia/image',
    path: 'dist/motion/Image.mjs',
    ignore: PEERS_IGNORE,
    limit: '10.3 kB',
  },
  {
    name: 'Motion.Pressable (subpath) — @rootnative/inertia/pressable',
    path: 'dist/motion/Pressable.mjs',
    ignore: PEERS_IGNORE,
    limit: '10.3 kB',
  },
  {
    name: 'Motion.ScrollView (subpath) — @rootnative/inertia/scroll-view',
    path: 'dist/motion/ScrollView.mjs',
    ignore: PEERS_IGNORE,
    limit: '10.3 kB',
  },
  {
    name: 'Full Motion namespace — @rootnative/inertia (root entry)',
    path: 'dist/index.mjs',
    ignore: PEERS_IGNORE,
    limit: '14.3 kB',
  },
  {
    name: 'MotionView (barrel, tree-shaken from root)',
    path: 'dist/index.mjs',
    import: '{ MotionView }',
    ignore: PEERS_IGNORE,
    limit: '10.3 kB',
  },
  {
    name: 'MotionText (barrel, tree-shaken from root)',
    path: 'dist/index.mjs',
    import: '{ MotionText }',
    ignore: PEERS_IGNORE,
    limit: '10.3 kB',
  },
  {
    name: 'MotionImage (barrel, tree-shaken from root)',
    path: 'dist/index.mjs',
    import: '{ MotionImage }',
    ignore: PEERS_IGNORE,
    limit: '10.3 kB',
  },
  {
    name: 'Testing helpers — @rootnative/inertia/testing',
    path: 'dist/testing/index.mjs',
    ignore: [...PEERS_IGNORE, '@testing-library/react-native'],
    limit: '1 kB',
  },
]
