import { Extrapolation } from 'react-native-reanimated'

/**
 * Extrapolation behavior at the edges of the input range. Mirrors
 * Reanimated's enum so consumers don't need a separate import.
 *
 * - `'clamp'` (default) — output stays pinned at the first/last value
 *   outside the input range. Matches Framer Motion's default.
 * - `'identity'` — return the input unchanged outside the range.
 * - `'extend'` — continue the linear slope beyond the range.
 */
export type ExtrapolationMode = 'clamp' | 'identity' | 'extend'

/** Map the public mode name to Reanimated's `Extrapolation` enum. */
export function mapExtrapolation(
  mode: ExtrapolationMode | undefined,
): Extrapolation {
  if (mode === 'identity') return Extrapolation.IDENTITY
  if (mode === 'extend') return Extrapolation.EXTEND
  return Extrapolation.CLAMP
}
