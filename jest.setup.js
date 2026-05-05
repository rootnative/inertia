// Override RN's Text mock — the default mockComponent crashes on arrow function
// components exported by RN 0.81's Flow `component` syntax.
jest.mock('react-native/Libraries/Text/Text', () => {
  const React = require('react')
  const Text = React.forwardRef(({ children, ...props }, ref) =>
    React.createElement('RCTText', { ...props, ref }, children),
  )
  Text.displayName = 'Text'
  return { __esModule: true, default: Text }
})

// Reanimated mock — STATIC RENDER ONLY.
//
// `useAnimatedStyle` invokes the worklet exactly once at render and returns
// a plain object. It is NOT live: mutating a shared value after mount does
// not re-run the worklet and the rendered style stays at its initial state.
//
// What this means for tests:
//   ✅ assert at-rest structure / role / accessibility / static styles
//   ❌ don't fire press / hover / focus and assert post-interaction styles
//      coming from `useSharedValue` + `withTiming`/`withSpring` — they will
//      silently read as the at-rest values
jest.mock('react-native-reanimated', () => {
  const React = require('react')
  const { Image, Pressable, ScrollView, Text, View } = require('react-native')

  const wrap = (Component, displayName) => {
    const Wrapped = React.forwardRef((props, ref) =>
      React.createElement(Component, { ...props, ref }),
    )
    Wrapped.displayName = displayName
    return Wrapped
  }

  const AnimatedView = wrap(View, 'Animated.View')
  const AnimatedText = wrap(Text, 'Animated.Text')
  const AnimatedImage = wrap(Image, 'Animated.Image')
  const AnimatedScrollView = wrap(ScrollView, 'Animated.ScrollView')

  return {
    __esModule: true,
    default: {
      View: AnimatedView,
      Text: AnimatedText,
      Image: AnimatedImage,
      ScrollView: AnimatedScrollView,
      createAnimatedComponent: (c) =>
        wrap(c, `Animated(${c.displayName ?? c.name ?? 'Component'})`),
    },
    View: AnimatedView,
    Text: AnimatedText,
    Image: AnimatedImage,
    ScrollView: AnimatedScrollView,
    useSharedValue: (initial) => ({ value: initial }),
    useDerivedValue: (fn) => ({ value: fn() }),
    useAnimatedStyle: (fn) => fn(),
    useAnimatedProps: (fn) => fn(),
    useAnimatedReaction: () => {},
    useReducedMotion: () => false,
    isWorkletFunction: () => false,
    cancelAnimation: () => {},
    runOnJS: (fn) => fn,
    runOnUI: (fn) => fn,
    withSpring: (v) => v,
    withTiming: (v) => v,
    withDecay: (v) => v,
    withDelay: (_d, v) => v,
    withRepeat: (v) => v,
    withSequence: (...args) => args[args.length - 1],
    Easing: {
      bezier: () => () => 0,
      ease: () => 0,
      inOut: (fn) => fn,
    },
    interpolate: (value, _input, output) =>
      value >= 1 ? output[output.length - 1] : output[0],
    interpolateColor: (value, _input, output) =>
      value >= 1 ? output[output.length - 1] : output[0],
  }
})
