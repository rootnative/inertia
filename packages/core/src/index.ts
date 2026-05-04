/**
 * `@onlynative/inertia` — declarative animation primitives for React Native.
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
export { MotionConfig, useMotionConfig, useShouldReduceMotion } from './config'
export type { MotionConfigValue, ReducedMotion } from './config'
export { Presence, usePresence } from './presence'
export type { PresenceContextValue } from './presence'
export {
  resolveTransition,
  resolveAnimatableValue,
  ensureWorkletEasing,
} from './transitions'
export { useVariants } from './values'
export type {
  AnimatableValue,
  AnimateStyle,
  AnimationCallbackInfo,
  DecayTransition,
  GestureSubStates,
  MotionComponent,
  MotionProps,
  NoAnimationTransition,
  PerPropertyTransition,
  RepeatConfig,
  SequenceStep,
  SpringTransition,
  TimingTransition,
  Transition,
  TransitionConfig,
  VariantController,
  VariantsMap,
} from './types'
