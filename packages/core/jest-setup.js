// Inertia's Jest setup. Loaded automatically by `@rootnative/inertia/jest-preset`,
// or addable to a hand-rolled config via `setupFiles`.
//
// The mocks here cover everything the core, gestures, gradients, and svg
// packages exercise. Re-create this list locally only if you can't use the
// preset (e.g. you have a custom transform pipeline that conflicts).

// `react-native-worklets` is a required peer of Reanimated 4 and ships its
// own native module. The source files import `isWorkletFunction` from it
// directly (Reanimated's re-export is deprecated); under Jest we stub the
// surface so the source guard works the same way the Reanimated mock does.
jest.mock('react-native-worklets', () => ({
  __esModule: true,
  isWorkletFunction: () => false,
}))

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

// Reanimated mock — STATIC RENDER, with stable `useSharedValue` semantics.
//
// `useAnimatedStyle` invokes the worklet exactly once per render and returns
// a plain object. It does not subscribe to shared-value mutations — to
// observe a post-mount target value you must trigger a re-render (the
// `renderWithMotion` / `flushMotion` helpers in `@rootnative/inertia/testing`
// do this for you).
//
// `useSharedValue` is backed by `useRef` so the same `{ value }` object
// persists across renders. After a `useEffect` assigns the target, the next
// render reads it back.
//
// What this means for tests:
//   ✅ assert at-rest structure / role / accessibility / static styles
//   ✅ assert post-effect target styles by re-rendering (use
//      `renderWithMotion` from the testing subpath)
//   ❌ frame-level intermediate states are not observable — physics doesn't
//      run; targets snap in one step.
jest.mock('react-native-reanimated', () => {
  const React = require('react')
  const { Image, ScrollView, Text, View } = require('react-native')

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
    useSharedValue: (initial) => {
      const ref = React.useRef(null)
      if (ref.current === null) ref.current = { value: initial }
      return ref.current
    },
    useDerivedValue: (fn) => ({ value: fn() }),
    useAnimatedStyle: (fn) => fn(),
    useAnimatedProps: (fn) => fn(),
    useAnimatedReaction: (prepare, react) => {
      // Best-effort sync invocation: run prepare() once, hand the result to
      // react() so tests can observe the side effect (e.g. `useSpring`
      // forwarding a target into its output shared value). Physics still
      // doesn't run — `withSpring` is the identity in this mock.
      const value = typeof prepare === 'function' ? prepare() : undefined
      if (typeof react === 'function') react(value, undefined)
    },
    useAnimatedScrollHandler: (handlers) => {
      // The real handler is an opaque worklet bag; in tests we return a plain
      // function that invokes the appropriate user handler synchronously so
      // assertions on scroll-driven shared values work without a native event
      // loop. Shape: `useAnimatedScrollHandler({ onScroll })` or
      // `useAnimatedScrollHandler(onScroll)`.
      const onScroll =
        typeof handlers === 'function' ? handlers : handlers?.onScroll
      return (event) => {
        if (typeof onScroll === 'function')
          onScroll(event?.nativeEvent ?? event)
      }
    },
    useReducedMotion: () => false,
    // Inertia's dev-time install check reads this to detect a too-old
    // Reanimated. The check is skipped under NODE_ENV=test, but the named
    // import must still resolve for consumers' test suites.
    reanimatedVersion: '4.0.0',
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
      // Reanimated 4's `Easing.bezier(...)` returns an `EasingFunctionFactory`
      // (`{ factory: () => EasingFunction }`), not a bare function. We surface
      // both shapes: the returned value is callable (backward-compat with
      // pre-4 call sites that did `Easing.bezier(...)(t)`) AND has `.factory()`
      // so the canonical Reanimated 4 unwrap `Easing.bezier(...).factory()`
      // works under Jest without consumer overrides.
      bezier: () => {
        const fn = () => 0
        fn.factory = () => fn
        return fn
      },
      ease: () => 0,
      linear: (t) => t,
      quad: () => 0,
      cubic: () => 0,
      sin: () => 0,
      circle: () => 0,
      exp: () => 0,
      poly: () => () => 0,
      back: () => () => 0,
      bounce: () => 0,
      elastic: () => () => 0,
      in: (fn) => fn,
      out: (fn) => fn,
      inOut: (fn) => fn,
      step0: () => 0,
      step1: () => 0,
    },
    interpolate: (value, _input, output) =>
      value >= 1 ? output[output.length - 1] : output[0],
    interpolateColor: (value, _input, output) =>
      value >= 1 ? output[output.length - 1] : output[0],
    Extrapolation: { CLAMP: 'clamp', IDENTITY: 'identity', EXTEND: 'extend' },
    // Layout-animation builder stub. The real builder is chainable and records
    // spring / timing config; tests assert against the recorded fields. Each
    // chain call returns a fresh instance with the field set so the resolver's
    // immutable-chain idiom (rebinding `builder = builder.x(...)`) works.
    LinearTransition: (() => {
      class LinearTransitionStub {
        constructor() {
          this.__kind = 'LinearTransition'
        }
        _clone(patch) {
          const next = new LinearTransitionStub()
          Object.assign(next, this, patch)
          return next
        }
        springify(duration) {
          return this._clone({ __mode: 'spring', __duration: duration })
        }
        damping(v) {
          return this._clone({ damping: v })
        }
        stiffness(v) {
          return this._clone({ stiffness: v })
        }
        mass(v) {
          return this._clone({ mass: v })
        }
        dampingRatio(v) {
          return this._clone({ dampingRatio: v })
        }
        duration(v) {
          return this._clone({ __mode: 'timing', __duration: v })
        }
        easing(fn) {
          return this._clone({ easing: fn })
        }
        delay(v) {
          return this._clone({ delay: v })
        }
        reduceMotion(v) {
          return this._clone({ reduceMotion: v })
        }
      }
      const proxy = new Proxy(LinearTransitionStub, {
        get(target, prop) {
          if (prop in target) return target[prop]
          // Forward static-style invocations to a fresh instance so
          // `LinearTransition.springify()` works as well as
          // `new LinearTransition().springify()`.
          return (...args) => {
            const instance = new LinearTransitionStub()
            return instance[prop](...args)
          }
        },
      })
      return proxy
    })(),
    ReduceMotion: { System: 'system', Always: 'always', Never: 'never' },
  }
})
