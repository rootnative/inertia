import { withSequence } from 'react-native-reanimated'
import {
  applyRepeat,
  repeatOf,
  resolveTransition,
  stripRepeat,
  type AnimationCallback,
  type CallbackFactory,
} from './resolve'
import {
  type AnimatableValue,
  type SequenceStep,
  type TransitionConfig,
} from '../types'

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
 *   3. array of either   → `withSequence` of resolved steps, with the
 *      top-level `repeat` applied at the **sequence level** (not per step).
 *      Per-step `repeat` overrides remain step-local.
 */
export function resolveAnimatableValue<V extends number | string>(
  value: AnimatableValue<V>,
  base: TransitionConfig | undefined,
  factory?: CallbackFactory,
): unknown {
  if (Array.isArray(value)) {
    const steps = value as ReadonlyArray<SequenceStep<V>>
    const stepBase = stripRepeat(base)
    const animations = steps.map((step, i) =>
      resolveStep(step, stepBase, factory?.('step', i)),
    )
    const seq = withSequence(...(animations as never[]))
    return applyRepeat(seq, base ? repeatOf(base) : undefined)
  }
  const step = value as SequenceStep<V>
  const cb = factory?.('animation', undefined)
  if (isStepObject<V>(step)) {
    return resolveStep(step, base, cb)
  }
  return resolveTransition(base, step as V, cb)
}

function resolveStep<V extends number | string>(
  step: SequenceStep<V>,
  base: TransitionConfig | undefined,
  cb?: AnimationCallback,
): unknown {
  if (isStepObject<V>(step)) {
    const { to, ...override } = step as { to: V } & Partial<TransitionConfig>
    const merged = mergeTransition(base, override as Partial<TransitionConfig>)
    return resolveTransition(merged, to, cb)
  }
  return resolveTransition(base, step as V, cb)
}

function mergeTransition(
  base: TransitionConfig | undefined,
  override: Partial<TransitionConfig>,
): TransitionConfig {
  // A `no-animation` base is a ceiling, not a default, so no step override can
  // talk its way past it. This is the reduced-motion gate: `configFor` in the
  // factory swaps every per-key transition for `{ type: 'no-animation' }`, and
  // the step-type rule below would otherwise hand a step its own `withTiming`
  // back — silently animating for a user who asked the OS not to. Keep this
  // branch first; it is the whole reason the gate holds for sequences.
  //
  // Returning `base` also drops any step `delay`, which matches how the rest
  // of the resolver already treats this type: `delayOf` and `repeatOf` both
  // return `undefined` for `no-animation`, so a snap is never deferred or
  // repeated anywhere in the library.
  if (base?.type === 'no-animation') return base
  // If the override declares a `type`, it wins outright — mixing fields from
  // a spring base into a timing override produces garbage. Otherwise inherit
  // the base's type and shallow-merge the rest.
  if (override.type && base && override.type !== base.type) {
    return override as TransitionConfig
  }
  return { ...(base ?? { type: 'spring' }), ...override } as TransitionConfig
}
