import { type ReactNode, useMemo } from 'react'
import { stableSig } from '../transitions/sig'
import { type NamedTransitions } from '../types'
import {
  MotionConfigContext,
  type MotionConfigValue,
  type ReducedMotion,
  useMotionConfig,
} from './MotionConfigContext'

export interface MotionConfigProps {
  /**
   * How descendants respond to reduced-motion preferences. Inherits from the
   * nearest ancestor `<MotionConfig>` when omitted (the root default is
   * `'user'` — respect the OS accessibility setting).
   */
  reducedMotion?: ReducedMotion
  /**
   * Named transitions available to every descendant wherever a
   * `TransitionConfig` is accepted — the `transition` prop (top-level and
   * per-property), the `layout` prop, and the value-layer hooks:
   *
   * ```tsx
   * <MotionConfig
   *   transitions={{
   *     'state-press': { type: 'timing', duration: 100 },
   *     selection: { type: 'spring', tension: 380, friction: 33 },
   *   }}
   * >
   *   <Motion.View animate={{ scale: 1 }} transition="selection" />
   * </MotionConfig>
   * ```
   *
   * Names resolve at the nearest provider; nested providers merge with the
   * ancestor registry, child entries overriding same-named ancestor entries.
   * Unknown names warn in dev and fall back to the library default spring.
   * Names are consumer vocabulary — Inertia ships no presets.
   */
  transitions?: NamedTransitions
  children: ReactNode
}

/**
 * Provider for subtree-wide animation config: reduced-motion behaviour and
 * the named-transition registry. Wrap the root of your app once with the
 * default (`reducedMotion="user"`) to respect the OS accessibility setting,
 * or scope a subtree with `'always'` / `'never'` for specific use cases.
 * Nested providers inherit from their ancestor: an omitted prop keeps the
 * ancestor's value, and `transitions` maps merge per name (child wins).
 */
export function MotionConfig({
  reducedMotion,
  transitions,
  children,
}: MotionConfigProps) {
  const parent = useMotionConfig()
  // Keyed on the structural signature, not object identity — consumers
  // routinely pass a fresh `transitions={{ ... }}` literal each render and
  // must not re-render every Motion descendant for it.
  const transitionsSig = stableSig(transitions)
  const value = useMemo<MotionConfigValue>(
    () => ({
      reducedMotion: reducedMotion ?? parent.reducedMotion,
      transitions: transitions
        ? { ...parent.transitions, ...transitions }
        : parent.transitions,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [reducedMotion, transitionsSig, parent],
  )
  return (
    <MotionConfigContext.Provider value={value}>
      {children}
    </MotionConfigContext.Provider>
  )
}
