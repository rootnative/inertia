/**
 * `@rootnative/inertia` — declarative animation primitives for React Native.
 *
 * Public surface: `Motion.View` / `Motion.Text` / `Motion.Image` /
 * `Motion.Pressable` / `Motion.ScrollView`, with `initial` / `animate` /
 * `exit` / `transition` / `variants` / `gesture` / `controller` /
 * `onAnimationEnd` props. Sequences, repeats (single-value and
 * sequence-level), spring / timing / decay / no-animation transitions,
 * and `<Presence>` for mount / unmount transitions all in scope.
 * `<MotionConfig reducedMotion>` gates motion against the OS setting.
 */
export {
  Motion,
  MotionView,
  MotionText,
  MotionImage,
  MotionPressable,
  MotionScrollView,
  MotionFlatList,
  createMotionComponent,
} from './motion'
export {
  MotionConfig,
  resolveNamedTransition,
  useMotionConfig,
  useNamedTransitions,
  useShouldReduceMotion,
} from './config'
export type {
  MotionConfigProps,
  MotionConfigValue,
  ReducedMotion,
} from './config'
export { Presence, usePresence } from './presence'
export type { PresenceContextValue } from './presence'
export { Stagger, useStaggerDelay } from './stagger'
export type { StaggerProps } from './stagger'
export {
  applyDelay,
  buildReleaseAnimation,
  cubicBezier,
  resolveTransition,
  resolveAnimatableValue,
  ensureWorkletEasing,
  type AnimationCallback,
} from './transitions'
// Seed value for any color shared value a custom animated component drives
// through `resolveTransition`. Exported because the obvious choice —
// `'transparent'` — cannot be animated away from; see the symbol's own docs.
export { TRANSPARENT } from './internal/color'
export {
  useAnimation,
  useAnimator,
  useBooleanSpring,
  useColorCascade,
  useColorTransition,
  useGesture,
  useInterpolatedStyle,
  useMotionValue,
  useScroll,
  useShadow,
  useSpring,
  useTransform,
  useVariants,
} from './values'
// The value-layer hooks above all return Reanimated `SharedValue`s — export
// the type so consumers can annotate props/refs that carry one (e.g. a
// scroll-offset prop) without importing from `react-native-reanimated`.
// Runtime render-layer interop lives in `@rootnative/inertia/reanimated`.
export type { SharedValue } from 'react-native-reanimated'
export type {
  Animator,
  BoxShadowLayer,
  ColorCascadeLayer,
  ColorStyleKey,
  ExtrapolationMode,
  InterpolatedStyle,
  InterpolatedStyleMap,
  NumericStyleKey,
  ShadowConfig,
  TransformKey,
  UseColorCascadeOptions,
  UseColorTransitionOptions,
  UseGestureHandlers,
  UseGestureResult,
  UseInterpolatedStyleOptions,
  UseScrollResult,
  UseShadowOptions,
  UseTransformOptions,
} from './values'
export type {
  AnimatableValue,
  AnimateStyle,
  AnimationCallbackInfo,
  BoxShadowInput,
  DecayTransition,
  EasingFunction,
  EasingFunctionFactory,
  EasingInput,
  GestureSubStates,
  MotionComponent,
  MotionProps,
  NamedTransitions,
  NoAnimationTransition,
  PerPropertyTransition,
  RegisteredTransitions,
  RepeatConfig,
  SequenceStep,
  SpringTransition,
  TimingTransition,
  Transition,
  TransitionConfig,
  TransitionInput,
  TransitionName,
  VariantController,
  VariantsMap,
} from './types'
