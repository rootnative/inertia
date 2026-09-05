import {
  Easing,
  withDecay,
  withDelay,
  withRepeat,
  withSpring,
  withTiming,
} from 'react-native-reanimated'
import { DEFAULT_TIMING_DURATION } from './constants'
import { ensureWorkletEasing } from './easing'
import { springToReanimated } from './spring'
import { warnOnce } from '../internal/warnOnce'
import {
  type DecayTransition,
  type RepeatConfig,
  type SpringTransition,
  type TimingTransition,
  type TransitionConfig,
} from '../types'

/**
 * UI-thread callback Reanimated invokes when an animation settles. Must be a
 * worklet — callers either author one with `'worklet'` or build one via
 * `runOnJS(...)` to bridge to JS-thread code.
 */
export type AnimationCallback = (
  finished?: boolean,
  current?: number | string,
) => void

/**
 * Per-step callback factory. Resolvers call this with the step's phase and
 * sequence index (or `undefined` for non-sequence animations) and attach the
 * resulting callback to the underlying `withSpring` / `withTiming` /
 * `withDecay` call.
 */
export type CallbackFactory = (
  phase: 'step' | 'animation',
  step: number | undefined,
) => AnimationCallback | undefined

function buildSpring(
  cfg: SpringTransition,
  toValue: number | string,
  cb?: AnimationCallback,
) {
  return withSpring(toValue as number, springToReanimated(cfg), cb as never)
}

function buildTiming(
  cfg: TimingTransition,
  toValue: number | string,
  cb?: AnimationCallback,
) {
  return withTiming(
    toValue as number,
    {
      duration: cfg.duration ?? DEFAULT_TIMING_DURATION,
      easing: ensureWorkletEasing(cfg.easing) ?? Easing.inOut(Easing.ease),
    },
    cb as never,
  )
}

function buildDecay(cfg: DecayTransition, cb?: AnimationCallback) {
  return withDecay(
    {
      velocity: cfg.velocity ?? 0,
      deceleration: cfg.deceleration,
      clamp: cfg.clamp,
    },
    cb as never,
  )
}

/**
 * Build a single-step animation (no repeat / no delay / no sequence) for a
 * given config + target. Pulled out so sequence steps can compose without
 * recursing into repeat/delay handling per step. The callback is forwarded
 * to Reanimated; for `no-animation` the callback is fired synchronously
 * since there's nothing to wait for.
 */
function buildOne(
  cfg: TransitionConfig,
  toValue: number | string,
  cb?: AnimationCallback,
): unknown {
  if (cfg.type === 'no-animation') {
    if (cb) cb(true, toValue)
    return toValue
  }
  if (cfg.type === 'decay') return buildDecay(cfg, cb)
  if (cfg.type === 'timing') return buildTiming(cfg, toValue, cb)
  return buildSpring(cfg as SpringTransition, toValue, cb)
}

/**
 * Normalised repeat: `count` is the total number of iterations
 * (`Number.POSITIVE_INFINITY` for `'infinite'`), `alternate` is the resolved
 * flag, `explicitAlternate` says whether the caller set `alternate` by hand.
 */
export interface NormalizedRepeat {
  count: number
  alternate: boolean
  explicitAlternate: boolean
}

/**
 * Reduce the three public `repeat` shapes to one record, or `undefined` when
 * the animation runs once. A count below `1` is treated as "run once" and
 * warns in dev: Reanimated's `withRepeat` reads `0` and negative counts as
 * endless, so forwarding them would turn `repeat: 0` into an infinite loop.
 */
export function normalizeRepeat(
  repeat: RepeatConfig | undefined,
): NormalizedRepeat | undefined {
  if (repeat === undefined) return undefined
  if (repeat === 'infinite') {
    return {
      count: Number.POSITIVE_INFINITY,
      alternate: true,
      explicitAlternate: false,
    }
  }
  const rawCount = typeof repeat === 'number' ? repeat : repeat.count
  const alternate = typeof repeat === 'number' ? true : repeat.alternate
  if (rawCount === 'infinite') {
    return {
      count: Number.POSITIVE_INFINITY,
      alternate: alternate ?? true,
      explicitAlternate: alternate !== undefined,
    }
  }
  if (!(rawCount >= 1)) {
    warnOnce(
      `repeat-count:${String(rawCount)}`,
      `[inertia] repeat count ${String(rawCount)} is below 1 — the ` +
        `animation runs once. Use \`repeat: 2\` or more to repeat, or ` +
        `\`repeat: 'infinite'\`. (Reanimated reads a count of 0 as endless, ` +
        `so it is not forwarded.)`,
    )
    return undefined
  }
  return {
    count: rawCount,
    alternate: alternate ?? true,
    explicitAlternate: alternate !== undefined,
  }
}

/**
 * Total number of iterations an animation built from `repeat` runs, including
 * the first pass. `1` when there is no repeat or the count is below 1;
 * `Number.POSITIVE_INFINITY` for `'infinite'`.
 */
export function repeatIterationsOf(repeat: RepeatConfig | undefined): number {
  return normalizeRepeat(repeat)?.count ?? 1
}

/**
 * Wrap an animation in `withRepeat` per the unified `repeat` shape:
 *   - `number`              → finite count, alternating direction
 *   - `'infinite'`          → endless, alternating direction
 *   - `{ count, alternate }`→ explicit; `alternate` defaults to `true`
 *
 * Pass `{ sequence: true }` when `animation` is a `withSequence` result.
 * Reanimated's `reverse` flag only swaps the wrapped animation's `toValue`,
 * which a sequence ignores — it restarts at step 0 on every pass — so the
 * flag is not forwarded for sequences. An explicit `alternate: true` on a
 * sequence warns in dev; write the reverse steps into the sequence instead.
 */
export function applyRepeat(
  animation: unknown,
  repeat: RepeatConfig | undefined,
  options?: { sequence?: boolean },
) {
  const r = normalizeRepeat(repeat)
  if (r === undefined) return animation
  const count = Number.isFinite(r.count) ? r.count : -1
  if (options?.sequence) {
    if (r.explicitAlternate && r.alternate) {
      warnOnce(
        'repeat-sequence-alternate',
        '[inertia] repeat.alternate has no effect on a sequence — Reanimated ' +
          'restarts a sequence at its first step on every pass. Append the ' +
          'reverse steps to the sequence to alternate.',
      )
    }
    return withRepeat(animation as never, count, false)
  }
  return withRepeat(animation as never, count, r.alternate)
}

/**
 * Wrap an animation in `withDelay`. A missing / zero / negative delay is a
 * pass-through. Exported for the factory's stagger wrap, which must delay a
 * fully-resolved animation exactly once — merging the delay into the base
 * config instead would re-apply it per sequence step.
 */
export function applyDelay(animation: unknown, delay: number | undefined) {
  if (!delay || delay <= 0) return animation
  return withDelay(delay, animation as never)
}

/**
 * Build a Reanimated animation for a single property. Runs on the JS thread
 * once per change and produces a baked `withSpring` / `withTiming` /
 * `withDecay` (optionally wrapped in `withDelay` / `withRepeat`) call. The
 * worklet body only consumes the result.
 *
 * `callback`, when provided, fires once when the underlying single-shot
 * animation settles. Repeat-wrapped animations forward the callback to
 * `withRepeat`, so it fires once per iteration as Reanimated does.
 */
export function resolveTransition(
  config: TransitionConfig | undefined,
  toValue: number | string,
  callback?: AnimationCallback,
): unknown {
  const cfg = config ?? ({ type: 'spring' } as SpringTransition)
  const base = buildOne(cfg, toValue, callback)
  const repeated = applyRepeat(base, repeatOf(cfg))
  return applyDelay(repeated, delayOf(cfg))
}

export function repeatOf(cfg: TransitionConfig): RepeatConfig | undefined {
  if (cfg.type === 'no-animation' || cfg.type === 'decay') return undefined
  return cfg.repeat
}

/**
 * Return `cfg` minus its `repeat` field. Used when peeling top-level repeat
 * off a base transition before passing it down to per-sequence-step
 * resolution — the sequence as a whole is what should repeat, not each step.
 */
export function stripRepeat(
  cfg: TransitionConfig | undefined,
): TransitionConfig | undefined {
  if (!cfg) return cfg
  if (cfg.type === 'no-animation' || cfg.type === 'decay') return cfg
  if (cfg.repeat === undefined) return cfg
  const next = { ...cfg }
  delete next.repeat
  return next
}

function delayOf(cfg: TransitionConfig): number | undefined {
  if (cfg.type === 'no-animation') return undefined
  return cfg.delay
}
