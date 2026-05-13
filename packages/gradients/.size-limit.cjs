// Bundle-size baseline + regression guard for @onlynative/inertia-gradients.
// Mirrors the policy in packages/core/.size-limit.cjs: peers (and the
// @onlynative/inertia peer itself) are ignored so the figure reflects what
// this package adds for a consumer who already ships Inertia.
//
// Limits sit ~25% above the recorded baseline to absorb dependency-update
// noise without alerting on every patch. When a real change pushes past a
// limit, decide whether to tighten or accept it; don't silently raise the
// cap. Record any baseline shift here when you do.
//
// ── Recorded baseline, brotlied + minified, 2026-05-14 ─────────────────────
//   MotionLinearGradient   1.26 kB
//
// The bulk of gradient interpolation work lives in @onlynative/inertia
// (resolveTransition, useShouldReduceMotion). This package only adds the
// shared-value plumbing, the per-frame animatedProps builder, and the
// length-lock guard — small by design.

const PEERS_IGNORE = [
  '@onlynative/inertia',
  'expo-linear-gradient',
  'react',
  'react/jsx-runtime',
  'react-native',
  'react-native-reanimated',
]

/** @type {import('size-limit').SizeLimitConfig} */
module.exports = [
  {
    name: 'MotionLinearGradient — @onlynative/inertia-gradients',
    path: 'dist/index.mjs',
    ignore: PEERS_IGNORE,
    limit: '3 kB',
  },
]
