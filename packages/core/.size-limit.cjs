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
// ── Recorded baselines, brotlied + minified, 2026-08-12, `Motion.FlatList`
//    (unreleased) ──
//   Motion.View subpath        9.11 kB
//   Motion.Text subpath        9.10 kB
//   Motion.Image subpath       9.13 kB
//   Motion.Pressable subpath   9.09 kB
//   Motion.ScrollView subpath  9.11 kB
//   Motion.FlatList subpath    9.10 kB   (new)
//   Full namespace (root)     12.32 kB   (was 12.28)
//   MotionView (barrel-shaken) 8.95 kB
//   MotionText (barrel-shaken) 8.95 kB
//   MotionImage (barrel-shaken)8.95 kB
//   Testing helpers              223 B   (unchanged)
//
// The new primitive costs **+0.04 kB root** and nothing per existing subpath.
// It is the cheapest primitive added so far because it is almost entirely the
// shared factory: no parser, no new interpolation, no new worklet branch. The
// only additions are `Animated.FlatList` (a peer import, so bundle-invisible)
// and a type-level cast that compiles away. A new primitive landing at
// parity with `Motion.ScrollView` is the expected shape — if one ever lands
// materially above it, that means factory code leaked into the primitive.
//
// ── Previous entry, 2026-07-29, `layoutId` style-prop
//    interpolation (unreleased, headed for `0.0.4`) ──
//   Motion.View subpath        8.80 kB   (was 8.24)
//   Motion.Text subpath        8.78 kB   (was 8.23)
//   Motion.Image subpath       8.80 kB   (was 8.23)
//   Motion.Pressable subpath   8.79 kB   (was 8.23)
//   Motion.ScrollView subpath  8.79 kB   (was 8.24)
//   Full namespace (root)     12.03 kB   (was 11.44)
//   MotionView (barrel-shaken) 8.65 kB   (was 8.07)
//   MotionText (barrel-shaken) 8.64 kB   (was 8.07)
//   MotionImage (barrel-shaken)8.64 kB   (was 8.06)
//   Testing helpers              223 B   (unchanged)
//
// +0.56 kB (+6.8%) per primitive subpath, +0.59 kB root. **The limits below
// did not move** — the ~25% band set for `boxShadow` absorbed this, leaving
// ~1.5 kB of headroom per primitive. Where it goes:
//
//   ~0.25 kB  factory: the carried-key set, the static-style scan that decides
//             which of those keys the element actually has a value for, the
//             snapshot reader, and the worklet's blend branch.
//   ~0.31 kB  `useSharedLayout`: the snapshot/progress pair, the carry driver,
//             and the registry's widened entry shape. Partly offset by
//             factoring `applyFlip`'s four near-identical transition branches
//             into one shared `legBuilder` — which the carry then reuses, so
//             the rect and the style are guaranteed to land together.
//
// Cheap relative to `boxShadow`'s +1.61 kB because it adds no parser and no
// new interpolation: carried keys are scalars and colors, so the worklet's
// existing lerp / `interpolateColor` branches do the work, and one progress
// value drives however many keys are being carried.
//
// ── Previous entry, 2026-07-26, `boxShadow` on the `animate` surface ──
//   Per-primitive subpaths went 6.63–6.66 → 8.23–8.24 kB; root 10.62 → 11.44.
//
// That was +1.61 kB (+24%) per primitive subpath for one animatable property,
// and the limits below were raised deliberately to match — not to make a red
// build green. Where it went, measured by building with each piece removed:
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
    name: 'Motion.FlatList (subpath) — @rootnative/inertia/flat-list',
    path: 'dist/motion/FlatList.mjs',
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
