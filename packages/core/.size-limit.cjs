// Bundle-size baseline. The point of these snapshots is to catch when an
// innocuous-looking change pulls a heavy dep into a primitive's subpath
// bundle, regressing the per-primitive tree-shaking guarantee.
//
// Peer deps (react, react-native, react-native-reanimated) are bundle-size-
// invisible because consumers provide them — `ignore` keeps the figure
// honest.
//
// Limits sit ~30% above the recorded Phase-1 baseline to absorb noise from
// dependency updates without alerting on every patch. When a real change
// pushes past the limit, decide whether to tighten or accept it; don't
// silently raise the cap.
//
// Recorded baselines (brotlied, minified, 2026-05-07):
//   Motion.View only       3.09 kB
//   Motion.Pressable only  3.09 kB
//   Full entry             3.71 kB

/** @type {import('size-limit').SizeLimitConfig} */
module.exports = [
  {
    name: 'Motion.View only — @onlynative/inertia/view',
    path: 'dist/motion/View.mjs',
    import: '{ MotionView }',
    ignore: ['react', 'react-native', 'react-native-reanimated'],
    limit: '4 KB',
  },
  {
    name: 'Motion.Pressable only — @onlynative/inertia/pressable',
    path: 'dist/motion/Pressable.mjs',
    import: '{ MotionPressable }',
    ignore: ['react', 'react-native', 'react-native-reanimated'],
    limit: '4 KB',
  },
  {
    name: 'Full entry — @onlynative/inertia (Motion.* + Presence + MotionConfig + useVariants)',
    path: 'dist/index.mjs',
    import:
      '{ Motion, Presence, MotionConfig, useVariants, createMotionComponent }',
    ignore: ['react', 'react-native', 'react-native-reanimated'],
    limit: '5 KB',
  },
]
