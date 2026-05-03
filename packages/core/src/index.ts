/**
 * `@onlynative/inertia` — declarative animation primitives for React Native.
 *
 * Alpha scope (v0.0.1-alpha): `Motion.View`, `Motion.Text`, `Motion.Image`
 * with `initial` / `animate` / `transition` (spring + timing). Sequences,
 * variants, gestures, `<Presence>`, and `decay` land across v0.1 phases 2-3.
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
