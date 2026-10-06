import { type TransitionConfig, type TransitionInput } from '../types'

/**
 * Field names that may appear on a `TransitionConfig` (spring / timing /
 * decay / no-animation). Used as a structural discriminator: if every key on
 * an object is in this set, the object is treated as a top-level transition;
 * otherwise it's a per-property / per-layer transition map, and the keys of
 * this set on that map are its default (see `transitionForKey`).
 *
 * Adding a new field to `TransitionConfig` requires adding the name here.
 */
export const TRANSITION_CONFIG_KEYS = new Set([
  'type',
  'tension',
  'friction',
  'mass',
  'velocity',
  'duration',
  'easing',
  'delay',
  'repeat',
  'deceleration',
  'clamp',
])

export function isTopLevelTransition(t: unknown): t is TransitionConfig {
  if (t === null || typeof t !== 'object') return false
  const keys = Object.keys(t as object)
  if (keys.length === 0) return false
  return keys.every((k) => TRANSITION_CONFIG_KEYS.has(k))
}

/**
 * The transition that a `transition` prop gives one key — a style property,
 * a gesture layer, or a prop of an adapter component.
 *
 * A top-level config or name applies to every key. A map gives a key its own
 * entry. A key with no entry gets the config keys of the map as its default,
 * so `{ type: 'spring', tension: 120, opacity: { type: 'timing' } }` springs
 * every key except `opacity`. An entry replaces the default whole; the two do
 * not merge. A registered name comes back as written, for
 * `resolveNamedTransition`.
 */
export function transitionForKey(
  transition: TransitionInput | object | undefined,
  key: string,
): TransitionInput | undefined {
  if (!transition || typeof transition === 'string') return transition
  if (isTopLevelTransition(transition)) return transition
  const map = transition as Record<string, TransitionInput | undefined>
  if (map[key] !== undefined) return map[key]
  let fallback: Record<string, unknown> | undefined
  for (const k in map) {
    if (TRANSITION_CONFIG_KEYS.has(k)) (fallback ??= {})[k] = map[k]
  }
  return fallback as TransitionConfig | undefined
}
