/**
 * `@onlynative/inertia` — declarative animation primitives for React Native.
 *
 * Alpha scope (v0.0.1-alpha): `Motion.View`, `Motion.Text`, `Motion.Image`
 * with `initial` / `animate` / `transition` (spring + timing). Sequences,
 * variants, gestures, `<Presence>`, and `decay` land across v0.1 phases 2-3.
 */
export { Motion, MotionView, MotionText, MotionImage, createMotionComponent } from './motion'
export { resolveTransition } from './transitions'
export type {
  AnimatableValue,
  AnimateStyle,
  AnimationCallbackInfo,
  DecayTransition,
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
} from './types'
