// Minimal mock of react-native-gesture-handler. The library ships its own
// jest setup that touches native modules; for hook-shape unit tests we need
// `usePanGesture` to hand back its config so the callbacks reach the
// assertions intact, and a `GestureDetector` that renders its child.
jest.mock('react-native-gesture-handler', () => {
  const { useMemo } = require('react')
  return {
    __esModule: true,
    // The real hook memoizes the gesture on the config identity, which the
    // identity tests of the adapter hooks rely on.
    usePanGesture: (config) =>
      useMemo(
        () => ({
          type: 'pan',
          handlerTag: 1,
          config,
          detectorCallbacks: {},
          gestureRelations: {
            simultaneousHandlers: [],
            waitFor: [],
            blocksHandlers: [],
          },
        }),
        [config],
      ),
    GestureDetector: ({ children }) => children,
  }
})
