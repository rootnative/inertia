/**
 * `@rootnative/inertia/reanimated` — the render-layer interop surface for
 * building custom animated components on top of Inertia's value layer
 * (`useMotionValue` / `useSpring` / `useGesture` / `useScroll` / …).
 *
 * Inertia's contract is that consumers should not need to import from
 * `react-native-reanimated` directly. Most of the time the declarative
 * `Motion.*` primitives cover that; when they don't — a component that owns
 * its own `useAnimatedStyle` worklet over Inertia-driven shared values —
 * this subpath provides the remaining rendering primitives so the consumer's
 * animation dependency stays `@rootnative/inertia` alone.
 *
 * Scope is deliberately render-layer only: animated host components, the
 * animated style/props hooks, worklet-safe interpolators, and cancellation.
 * Starting animations stays in Inertia's transition vocabulary —
 * `useAnimation` / `useSpring` declaratively, `resolveTransition` /
 * `buildReleaseAnimation` imperatively — so the `with*` animation factories
 * are intentionally not re-exported here.
 *
 * Everything is re-exported under its original Reanimated name. That is a
 * hard constraint, not a style choice: the Reanimated Babel plugin
 * auto-workletizes the callbacks passed to `useAnimatedStyle` /
 * `useAnimatedProps` / `useDerivedValue` by callee *name*, so a renamed
 * wrapper would silently stop workletizing consumer callbacks. Re-exports
 * keep the name and the behavior from any import path.
 */
export {
  default as Animated,
  Extrapolation,
  cancelAnimation,
  createAnimatedComponent,
  interpolate,
  interpolateColor,
  useAnimatedProps,
  useAnimatedStyle,
  useDerivedValue,
} from 'react-native-reanimated'
export type {
  AnimatedProps,
  AnimatedStyle,
  DerivedValue,
  SharedValue,
} from 'react-native-reanimated'
