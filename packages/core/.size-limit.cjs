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
// ── Recorded baselines, brotlied + minified, 2026-07-25 (0.0.2 + the
//    style-resting / Presence-order / endless-repeat / cascade fixes) ─────
//   Motion.View subpath        6.63 kB
//   Motion.Text subpath        6.64 kB
//   Motion.Image subpath       6.64 kB
//   Motion.Pressable subpath   6.63 kB
//   Motion.ScrollView subpath  6.66 kB
//   Full namespace (root)     10.62 kB
//   MotionView (barrel-shaken) 6.50 kB
//   MotionText (barrel-shaken) 6.49 kB
//   MotionImage (barrel-shaken)6.49 kB
//   Testing helpers              223 B
//
// The previous baselines here were dated 2026-05-11 and read ~9.7 kB per
// subpath — roughly 3 kB above reality, so the comment had been actively
// misleading for two releases. Re-record whenever you touch this file.
//
// The limits below were left at 13/14 kB while the bundle shrank to ~6.6 kB,
// which is ~2x headroom — enough for the guard to sleep through a doubling in
// size. They are now back to the ~25% band this file has always claimed.
//
// All subpath / barrel-shaken entries collapse onto the shared
// `createMotionComponent` factory (~6.5 kB). That factory carries the
// per-key resolver, gesture composition, variants, sequences, repeat,
// Presence integration, callback dispatch, color/transform handling, and
// reduced-motion plumbing — i.e. the work that lets a consumer write
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
    limit: '8.3 kB',
  },
  {
    name: 'Motion.Text (subpath) — @rootnative/inertia/text',
    path: 'dist/motion/Text.mjs',
    ignore: PEERS_IGNORE,
    limit: '8.3 kB',
  },
  {
    name: 'Motion.Image (subpath) — @rootnative/inertia/image',
    path: 'dist/motion/Image.mjs',
    ignore: PEERS_IGNORE,
    limit: '8.3 kB',
  },
  {
    name: 'Motion.Pressable (subpath) — @rootnative/inertia/pressable',
    path: 'dist/motion/Pressable.mjs',
    ignore: PEERS_IGNORE,
    limit: '8.3 kB',
  },
  {
    name: 'Motion.ScrollView (subpath) — @rootnative/inertia/scroll-view',
    path: 'dist/motion/ScrollView.mjs',
    ignore: PEERS_IGNORE,
    limit: '8.3 kB',
  },
  {
    name: 'Full Motion namespace — @rootnative/inertia (root entry)',
    path: 'dist/index.mjs',
    ignore: PEERS_IGNORE,
    limit: '13.3 kB',
  },
  {
    name: 'MotionView (barrel, tree-shaken from root)',
    path: 'dist/index.mjs',
    import: '{ MotionView }',
    ignore: PEERS_IGNORE,
    limit: '8.3 kB',
  },
  {
    name: 'MotionText (barrel, tree-shaken from root)',
    path: 'dist/index.mjs',
    import: '{ MotionText }',
    ignore: PEERS_IGNORE,
    limit: '8.3 kB',
  },
  {
    name: 'MotionImage (barrel, tree-shaken from root)',
    path: 'dist/index.mjs',
    import: '{ MotionImage }',
    ignore: PEERS_IGNORE,
    limit: '8.3 kB',
  },
  {
    name: 'Testing helpers — @rootnative/inertia/testing',
    path: 'dist/testing/index.mjs',
    ignore: [...PEERS_IGNORE, '@testing-library/react-native'],
    limit: '1 kB',
  },
]
