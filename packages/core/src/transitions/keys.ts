import { type TransitionConfig } from '../types'

/**
 * Field names that may appear on a `TransitionConfig` (spring / timing /
 * decay / no-animation). Used as a structural discriminator: if every key on
 * an object is in this set, the object is treated as a top-level transition;
 * otherwise it's a per-property / per-layer transition map.
 *
 * Adding a new field to `TransitionConfig` requires adding the name here.
 */
export const TRANSITION_CONFIG_KEYS = new Set([
  'type',
  'tension',
  'friction',
  'mass',
  'velocity',
  'restSpeedThreshold',
  'restDisplacementThreshold',
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
