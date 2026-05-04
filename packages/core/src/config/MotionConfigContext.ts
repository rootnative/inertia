import { createContext, useContext } from 'react'
import { useReducedMotion } from 'react-native-reanimated'

/**
 * How descendant Motion primitives should treat reduced-motion preferences.
 *
 * - `'user'` (default): defer to the OS accessibility setting via
 *   Reanimated's `useReducedMotion()`. This is the only value that respects
 *   user choice and is the right default for app-level wrappers.
 * - `'never'`: animate regardless of OS setting. Use sparingly — e.g. for
 *   onboarding transitions you've decided are essential.
 * - `'always'`: never animate, regardless of OS setting. Useful for tests
 *   and snapshots.
 */
export type ReducedMotion = 'user' | 'never' | 'always'

export interface MotionConfigValue {
  reducedMotion: ReducedMotion
}

/**
 * Default config used when a Motion primitive is rendered without a
 * `<MotionConfig>` ancestor. `'user'` means respect the OS setting.
 */
export const DEFAULT_MOTION_CONFIG: MotionConfigValue = {
  reducedMotion: 'user',
}

export const MotionConfigContext = createContext<MotionConfigValue>(
  DEFAULT_MOTION_CONFIG,
)

/**
 * Read the active `<MotionConfig>` from a descendant. Returns the default
 * (`'user'`) when no provider is present.
 */
export function useMotionConfig(): MotionConfigValue {
  return useContext(MotionConfigContext)
}

/**
 * Resolve the active reduced-motion mode to a boolean. `'user'` consults
 * Reanimated's OS-backed hook; `'always'` / `'never'` shortcut. Motion
 * primitives call this to decide whether to swap transitions for
 * `no-animation`.
 */
export function useShouldReduceMotion(): boolean {
  const { reducedMotion } = useMotionConfig()
  const osReduced = useReducedMotion()
  if (reducedMotion === 'never') return false
  if (reducedMotion === 'always') return true
  return osReduced
}
