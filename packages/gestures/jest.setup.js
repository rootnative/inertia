// Minimal mock of react-native-gesture-handler. The library ships its own
// jest setup that touches native modules; for hook-shape unit tests we just
// need `Gesture.Pan()` to return a chainable builder so `.onStart()` / `.onUpdate()`
// / `.onEnd()` calls don't throw, plus the resulting object reaches the
// assertions intact.
jest.mock('react-native-gesture-handler', () => {
  const chain = () => {
    const builder = {
      __isPan: true,
      handlers: {},
    }
    const methods = ['onBegin', 'onStart', 'onUpdate', 'onEnd', 'onFinalize']
    for (const m of methods) {
      builder[m] = (fn) => {
        builder.handlers[m] = fn
        return builder
      }
    }
    builder.minDistance = () => builder
    builder.activeOffsetX = () => builder
    builder.activeOffsetY = () => builder
    builder.failOffsetX = () => builder
    builder.failOffsetY = () => builder
    return builder
  }
  return {
    __esModule: true,
    Gesture: {
      Pan: chain,
    },
    GestureDetector: ({ children }) => children,
  }
})
