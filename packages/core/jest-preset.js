// Jest preset for projects consuming `@rootnative/inertia` and its sibling
// adapter packages (`@rootnative/inertia-gestures`, `-gradients`, `-svg`).
//
// Layered on top of `@react-native/jest-preset`. Adds:
//   - the `react-native-worklets` + Reanimated mock surface Inertia exercises
//     (worklet stubs, animation primitives, color/layout utilities)
//   - `transformIgnorePatterns` widened so Jest transforms the published
//     ESM/CJS bundles of `@rootnative/inertia*` and `react-native-worklets`
//     (their `dist/` files are ESM-only and won't run through the default
//     `react-native` transformIgnorePatterns)
//
// Usage:
//
//   // jest.config.js
//   module.exports = {
//     preset: require.resolve('@rootnative/inertia/jest-preset'),
//   }
//
// If you need to allowlist additional packages for transformation, extend
// `transformIgnorePatterns` in your own config — Jest merges over the preset.

// This package is deliberately **not** declared as a peer dependency of
// `@rootnative/inertia`. React Native pins it to an exact version (RN 0.86.3
// requires exactly `@react-native/jest-preset@0.86.3`), so any range we
// declared would advertise versions that cannot install — the sdk-compat range
// audit fails on it — and an exact pin would break on every RN patch. The
// version relationship belongs to `react-native`, which already declares it.
//
// Resolve `@react-native/jest-preset` directly rather than through the
// `react-native/jest-preset` shim. RN 0.86 moved the preset into its own
// package and left the old path as a shim that re-exports it — but it declares
// the new package as an **optional** peer, and no package manager installs an
// optional peer. So on RN 0.86 the shim throws a migration error for any
// consumer who has not installed it by hand, which is what a consumer of this
// preset would have hit. Requiring it here means the failure names this
// package's requirement instead.
let rnPreset
try {
  rnPreset = require('@react-native/jest-preset')
} catch (error) {
  if (error.code === 'MODULE_NOT_FOUND') {
    throw new Error(
      '[inertia] `@rootnative/inertia/jest-preset` needs `@react-native/jest-preset`.\n' +
        'React Native 0.86 moved its Jest preset into that package and declares\n' +
        'it as an optional peer, so it is not installed for you. Add it as a\n' +
        'devDependency at the version matching your react-native:\n\n' +
        '  npm install --save-dev @react-native/jest-preset\n',
    )
  }
  throw error
}

module.exports = {
  ...rnPreset,
  setupFiles: [
    ...(rnPreset.setupFiles ?? []),
    require.resolve('./jest-setup.js'),
  ],
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|@react-native-community|@rootnative/inertia|@rootnative/inertia-gestures|@rootnative/inertia-gradients|@rootnative/inertia-svg|react-native-worklets)/)',
  ],
}
