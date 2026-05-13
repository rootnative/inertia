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
// ── Recorded baselines, brotlied + minified, 2026-05-11 (alpha.3 + scale/
//    rotate AnimateStyle fix) ────────────────────────────────────────────
//   Motion.View subpath        9.78 kB
//   Motion.Text subpath        9.80 kB
//   Motion.Image subpath       9.78 kB
//   Motion.Pressable subpath   9.79 kB
//   Motion.ScrollView subpath  9.78 kB
//   Full namespace (root)     10.76 kB
//   MotionView (barrel-shaken) 9.67 kB
//   MotionText (barrel-shaken) 9.64 kB
//   MotionImage (barrel-shaken)9.64 kB
//   Testing helpers              223 B
//
// All subpath / barrel-shaken entries collapse onto the shared
// `createMotionComponent` factory (~9-10 kB). That factory carries the
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
    name: 'Motion.View (subpath) — @onlynative/inertia/view',
    path: 'dist/motion/View.mjs',
    ignore: PEERS_IGNORE,
    limit: '13 kB',
  },
  {
    name: 'Motion.Text (subpath) — @onlynative/inertia/text',
    path: 'dist/motion/Text.mjs',
    ignore: PEERS_IGNORE,
    limit: '13 kB',
  },
  {
    name: 'Motion.Image (subpath) — @onlynative/inertia/image',
    path: 'dist/motion/Image.mjs',
    ignore: PEERS_IGNORE,
    limit: '13 kB',
  },
  {
    name: 'Motion.Pressable (subpath) — @onlynative/inertia/pressable',
    path: 'dist/motion/Pressable.mjs',
    ignore: PEERS_IGNORE,
    limit: '13 kB',
  },
  {
    name: 'Motion.ScrollView (subpath) — @onlynative/inertia/scroll-view',
    path: 'dist/motion/ScrollView.mjs',
    ignore: PEERS_IGNORE,
    limit: '13 kB',
  },
  {
    name: 'Full Motion namespace — @onlynative/inertia (root entry)',
    path: 'dist/index.mjs',
    ignore: PEERS_IGNORE,
    limit: '14 kB',
  },
  {
    name: 'MotionView (barrel, tree-shaken from root)',
    path: 'dist/index.mjs',
    import: '{ MotionView }',
    ignore: PEERS_IGNORE,
    limit: '13 kB',
  },
  {
    name: 'MotionText (barrel, tree-shaken from root)',
    path: 'dist/index.mjs',
    import: '{ MotionText }',
    ignore: PEERS_IGNORE,
    limit: '13 kB',
  },
  {
    name: 'MotionImage (barrel, tree-shaken from root)',
    path: 'dist/index.mjs',
    import: '{ MotionImage }',
    ignore: PEERS_IGNORE,
    limit: '13 kB',
  },
  {
    name: 'Testing helpers — @onlynative/inertia/testing',
    path: 'dist/testing/index.mjs',
    ignore: [...PEERS_IGNORE, '@testing-library/react-native'],
    limit: '1 kB',
  },
]
