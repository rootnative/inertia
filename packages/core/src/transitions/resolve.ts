import {
  Easing,
  withDecay,
  withDelay,
  withRepeat,
  withSpring,
  withTiming,
} from 'react-native-reanimated'
import { ensureWorkletEasing } from './easing'
import { springToReanimated } from './spring'
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

const DEFAULT_TIMING_DURATION = 250

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
 * Wrap an animation in `withRepeat` per the unified `repeat` shape:
 *   - `number`              → finite count, alternating direction
 *   - `'infinite'`          → endless, alternating direction
 *   - `{ count, alternate }`→ explicit; `alternate` defaults to `true`
 */
export function applyRepeat(
  animation: unknown,
  repeat: RepeatConfig | undefined,
) {
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
