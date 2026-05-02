import {
  Easing,
  withDecay,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated'
import { ensureWorkletEasing } from './easing'
import {
  type AnimatableValue,
  type DecayTransition,
  type RepeatConfig,
  type SequenceStep,
  type SpringTransition,
  type TimingTransition,
  type TransitionConfig,
} from '../types'

/**
 * Default spring physics, expressed in react-spring vocabulary. Conversion
 * to Reanimated's raw `stiffness` / `damping` lives below; raw config never
 * leaks past this module.
 */
const DEFAULT_SPRING: Required<
  Pick<SpringTransition, 'tension' | 'friction' | 'mass'>
> = {
  tension: 170,
  friction: 26,
  mass: 1,
}

const DEFAULT_TIMING_DURATION = 250

function springToReanimated(t: SpringTransition) {
  return {
    stiffness: t.tension ?? DEFAULT_SPRING.tension,
    damping: t.friction ?? DEFAULT_SPRING.friction,
    mass: t.mass ?? DEFAULT_SPRING.mass,
    velocity: t.velocity,
    restSpeedThreshold: t.restSpeedThreshold,
    restDisplacementThreshold: t.restDisplacementThreshold,
  }
}

function buildSpring(cfg: SpringTransition, toValue: number | string) {
  return withSpring(toValue as number, springToReanimated(cfg))
}

function buildTiming(cfg: TimingTransition, toValue: number | string) {
  return withTiming(toValue as number, {
    duration: cfg.duration ?? DEFAULT_TIMING_DURATION,
    easing: ensureWorkletEasing(cfg.easing) ?? Easing.inOut(Easing.ease),
  })
}

function buildDecay(cfg: DecayTransition) {
  return withDecay({
    velocity: cfg.velocity ?? 0,
    deceleration: cfg.deceleration,
    clamp: cfg.clamp,
  })
}

/**
 * Build a single-step animation (no repeat / no delay / no sequence) for a
 * given config + target. Pulled out so sequence steps can compose without
 * recursing into repeat/delay handling per step.
 */
function buildOne(cfg: TransitionConfig, toValue: number | string): unknown {
  if (cfg.type === 'no-animation') return toValue
  if (cfg.type === 'decay') return buildDecay(cfg)
  if (cfg.type === 'timing') return buildTiming(cfg, toValue)
  return buildSpring(cfg as SpringTransition, toValue)
}

/**
 * Wrap an animation in `withRepeat` per the unified `repeat` shape:
 *   - `number`              → finite count, alternating direction
 *   - `'infinite'`          → endless, alternating direction
 *   - `{ count, alternate }`→ explicit; `alternate` defaults to `true`
 */
function applyRepeat(animation: unknown, repeat: RepeatConfig | undefined) {
  if (repeat === undefined) return animation
  if (repeat === 'infinite') {
    return withRepeat(animation as never, -1, true)
  }
  if (typeof repeat === 'number') {
    return withRepeat(animation as never, repeat, true)
  }
  const count = repeat.count === 'infinite' ? -1 : repeat.count
  const alternate = repeat.alternate ?? true
  return withRepeat(animation as never, count, alternate)
}

function applyDelay(animation: unknown, delay: number | undefined) {
  if (!delay || delay <= 0) return animation
  return withDelay(delay, animation as never)
}

/**
 * Build a Reanimated animation for a single property. Runs on the JS thread
 * once per change and produces a baked `withSpring` / `withTiming` /
 * `withDecay` (optionally wrapped in `withDelay` / `withRepeat`) call. The
 * worklet body only consumes the result.
 */
export function resolveTransition(
  config: TransitionConfig | undefined,
  toValue: number | string,
): unknown {
  const cfg = config ?? ({ type: 'spring' } as SpringTransition)
  const base = buildOne(cfg, toValue)
  const repeated = applyRepeat(base, repeatOf(cfg))
  return applyDelay(repeated, delayOf(cfg))
}

function repeatOf(cfg: TransitionConfig): RepeatConfig | undefined {
  if (cfg.type === 'no-animation' || cfg.type === 'decay') return undefined
  return cfg.repeat
}

function delayOf(cfg: TransitionConfig): number | undefined {
  if (cfg.type === 'no-animation') return undefined
  return cfg.delay
}

/**
 * True when the value is a `{ to, ...transitionOverride }` sequence step.
 * Plain numbers and plain transition objects fail this check.
 */
function isStepObject<V>(
  v: SequenceStep<V> | V,
): v is Extract<SequenceStep<V>, { to: V }> {
  return (
    typeof v === 'object' &&
    v !== null &&
    !Array.isArray(v) &&
    'to' in (v as object)
  )
}

/**
 * Resolve a per-property `animate` value into a Reanimated animation.
 *
 * Handles the three shapes of `AnimatableValue`:
 *   1. plain value      → single `resolveTransition` call
 *   2. `{ to, ...over }` → single step with the override merged into `base`
 *   3. array of either   → `withSequence` of resolved steps
 */
export function resolveAnimatableValue<V extends number | string>(
  value: AnimatableValue<V>,
  base: TransitionConfig | undefined,
): unknown {
  if (Array.isArray(value)) {
    const steps = value as ReadonlyArray<SequenceStep<V>>
    const animations = steps.map((step) => resolveStep(step, base))
    return withSequence(...(animations as never[]))
  }
  const step = value as SequenceStep<V>
  if (isStepObject<V>(step)) {
    return resolveStep(step, base)
  }
  return resolveTransition(base, step as V)
}

function resolveStep<V extends number | string>(
  step: SequenceStep<V>,
  base: TransitionConfig | undefined,
): unknown {
  if (isStepObject<V>(step)) {
    const { to, ...override } = step as { to: V } & Partial<TransitionConfig>
    const merged = mergeTransition(base, override as Partial<TransitionConfig>)
    return resolveTransition(merged, to)
  }
  return resolveTransition(base, step as V)
}

function mergeTransition(
  base: TransitionConfig | undefined,
  override: Partial<TransitionConfig>,
): TransitionConfig {
  // If the override declares a `type`, it wins outright — mixing fields from
  // a spring base into a timing override produces garbage. Otherwise inherit
  // the base's type and shallow-merge the rest.
  if (override.type && base && override.type !== base.type) {
    return override as TransitionConfig
  }
  return { ...(base ?? { type: 'spring' }), ...override } as TransitionConfig
}
