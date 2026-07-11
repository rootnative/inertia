import { isTopLevelTransition } from '../transitions/keys'
import {
  type NamedTransitions,
  type Transition,
  type TransitionConfig,
  type TransitionInput,
} from '../types'

declare const __DEV__: boolean

/**
 * Fallback used when a name isn't found in the registry: the library default
 * spring, matching what an omitted transition resolves to everywhere else.
 */
const UNKNOWN_NAME_FALLBACK: TransitionConfig = { type: 'spring' }

/**
 * Look a registered transition name up in a registry. Unknown names warn in
 * dev and fall back to the library default spring — the animation still runs,
 * it just isn't the one the token intended, which is the same failure
 * softness the web platform gives an unknown CSS keyword.
 */
export function lookupNamedTransition(
  name: string,
  registry: NamedTransitions,
): TransitionConfig {
  const cfg = registry[name]
  if (cfg) return cfg
  if (__DEV__) {
    console.warn(
      `[inertia] Unknown transition name "${name}" — falling back to the ` +
        `default spring. Register it on a provider: ` +
        `<MotionConfig transitions={{ '${name}': { ... } }}>.`,
    )
  }
  return UNKNOWN_NAME_FALLBACK
}

/**
 * Resolve a single transition input — a `TransitionConfig` passes through
 * untouched, a `TransitionName` is looked up in `registry`. This is the
 * building block adapter packages use to accept names wherever they accept a
 * config (pair it with `useNamedTransitions()` for the registry).
 */
export function resolveNamedTransition(
  input: TransitionInput | undefined,
  registry: NamedTransitions,
): TransitionConfig | undefined {
  if (input === undefined) return undefined
  if (typeof input === 'string') return lookupNamedTransition(input, registry)
  return input
}

/**
 * Resolve every name inside a `transition` prop value — the top-level string
 * form, and string values on the per-property / gesture-layer map form.
 * Identity-preserving: when the input contains no names it is returned
 * unchanged, so signature- and identity-keyed memoization downstream is
 * unaffected for the config-object path.
 */
export function resolveNamedTransitionProp<S>(
  transition: Transition<S> | undefined,
  registry: NamedTransitions,
): Exclude<Transition<S>, string> | undefined {
  if (transition === undefined) return undefined
  if (typeof transition === 'string') {
    return lookupNamedTransition(transition, registry)
  }
  if (isTopLevelTransition(transition)) return transition
  const map = transition as Record<string, unknown>
  let out: Record<string, unknown> | null = null
  for (const key in map) {
    const value = map[key]
    if (typeof value === 'string') {
      if (out === null) out = { ...map }
      out[key] = lookupNamedTransition(value, registry)
    }
  }
  return (out ?? transition) as Exclude<Transition<S>, string>
}
