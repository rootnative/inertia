// Jest preset for projects consuming `@rootnative/inertia` and its sibling
// adapter packages (`@rootnative/inertia-gestures`, `-gradients`, `-svg`).
//
// Layered on top of `react-native`'s own preset. Adds:
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

const rnPreset = require('react-native/jest-preset')

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
