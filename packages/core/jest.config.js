/** @type {import('jest').Config} */
module.exports = {
  preset: 'react-native',
  rootDir: '.',
  setupFiles: ['<rootDir>/../../jest.setup.js'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  testMatch: ['<rootDir>/src/**/__tests__/**/*.test.(ts|tsx)'],
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|@react-native-community)/)',
  ],
  // The `react-native` preset's runtime polyfills (timers, the batched bridge)
  // keep a jest-worker alive past Jest's shutdown grace period, so the runner
  // force-kills it and prints "A worker process has failed to exit gracefully".
  // It is not a leak in our code: `jest --detectOpenHandles` (which runs
  // in-band) reports zero open handles. We have no raw timers in source and the
  // Reanimated mock is fully synchronous. `forceExit` suppresses the benign
  // warning. Trade-off: it also disables the warning as an early signal, so if
  // a real handle is ever introduced, catch it by re-running with
  // `--detectOpenHandles` rather than relying on the worker-exit message.
  forceExit: true,
}
