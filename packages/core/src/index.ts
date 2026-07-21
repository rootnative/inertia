/**
 * `@rootnative/inertia` — declarative animation primitives for React Native.
 *
 * v0.1 surface: `Motion.View` / `Motion.Text` / `Motion.Image` /
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
export {
  buildReleaseAnimation,
  cubicBezier,
  resolveTransition,
  resolveAnimatableValue,
  ensureWorkletEasing,
} from './transitions'
export {
  useAnimation,
  useBooleanSpring,
  useColorTransition,
  useGesture,
  useMotionValue,
  useScroll,
  useShadow,
  useSpring,
  useTransform,
  useVariants,
} from './values'
export type {
  BoxShadowLayer,
  ColorStyleKey,
  ExtrapolationMode,
  ShadowConfig,
  UseColorTransitionOptions,
  UseGestureHandlers,
  UseGestureResult,
  UseScrollResult,
  UseShadowOptions,
  UseTransformOptions,
} from './values'
export type {
  AnimatableValue,
  AnimateStyle,
  AnimationCallbackInfo,
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
