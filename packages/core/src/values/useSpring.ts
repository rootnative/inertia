import { useEffect, useMemo } from 'react'
import {
  useAnimatedReaction,
  useSharedValue,
  withSpring,
  type SharedValue,
} from 'react-native-reanimated'
import { springToReanimated } from '../transitions/spring'
import { type SpringTransition } from '../types'

/**
 * Animate a shared value toward `target` with spring physics, using the
 * library's react-spring vocabulary (`tension` / `friction` / `mass`).
 *
 * `target` may be a plain number or a `SharedValue<number>`. The plain-number
 * path drives the spring from a JS `useEffect`, so the animation re-runs on
 * every render where `target` changes. The shared-value path drives the
 * spring from a Reanimated reaction on the UI thread, so values produced by
 * gestures, scroll handlers, or other worklets flow through without bouncing
 * back to JS.
 *
 * Both call sites end up at the same `withSpring` invocation; the split is
 * just about which thread observes the source change.
 */
export function useSpring(
  target: number | SharedValue<number>,
  config?: SpringTransition,
): SharedValue<number> {
  // Reanimated config is rebuilt only when the public config object changes
  // shape. The worklet path reads this from JS-thread closure capture, which
  // is fine: it's the resolved config that's invariant across UI-thread
  // ticks, not a JS-thread reference that would go stale.
  const reanimConfig = useMemo(
    () => springToReanimated(config ?? {}),
    // Keyed on the resolved primitive fields rather than the `config` object
    // identity: callers routinely pass a fresh object literal each render, so
    // depending on `config` itself would rebuild the Reanimated config on
    // every render and defeat the memo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      config?.tension,
      config?.friction,
      config?.mass,
      config?.velocity,
      config?.restSpeedThreshold,
      config?.restDisplacementThreshold,
    ],
  )

  const isSharedTarget = isSharedValue(target)
  const initial = isSharedTarget ? target.value : (target as number)
  const output = useSharedValue<number>(initial)

  // Plain-number path. The reaction below is a no-op when `target` is a
  // number, so this effect carries the change. Reading `target` directly in
  // the dep array means React drives the schedule; we don't have to babysit
  // a stale closure.
  useEffect(() => {
    if (isSharedTarget) return
    output.value = withSpring(target as number, reanimConfig)
    // `output` is identity-stable per hook instance (Reanimated guarantee).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSharedTarget, target, reanimConfig])

  // SharedValue path. `useAnimatedReaction` runs the prepare worklet whenever
  // its returned value changes; we read `.value` off the target SV and pipe
  // it through `withSpring` on the UI thread. When the target is a plain
  // number we never declare a source so the reaction is inert (returns
  // `null`, never fires `react`).
  useAnimatedReaction(
    () => {
      'worklet'
      if (!isSharedTarget) return null
      return (target as SharedValue<number>).value
    },
    (next, prev) => {
      'worklet'
      if (next === null || next === prev) return
      output.value = withSpring(next, reanimConfig)
    },
    [isSharedTarget, reanimConfig],
  )

  return output
}

function isSharedValue(v: unknown): v is SharedValue<number> {
  // SharedValues are plain objects with a single `value` accessor — there is
  // no public constructor or instanceof check. Reading `'value' in v` on any
  // POJO would also pass, but the hook's call site already narrows the type;
  // this guard exists to dispatch between the two implementation paths, not
  // to validate untrusted input.
  return (
    typeof v === 'object' &&
    v !== null &&
    'value' in (v as Record<string, unknown>)
  )
}
