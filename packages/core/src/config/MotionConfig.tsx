import { type ReactNode, useMemo } from 'react'
import {
  MotionConfigContext,
  type MotionConfigValue,
  type ReducedMotion,
} from './MotionConfigContext'

/**
 * Provider that controls how descendant Motion primitives respond to
 * reduced-motion preferences. Wrap the root of your app once with the
 * default (`reducedMotion="user"`) to respect the OS accessibility setting,
 * or scope a subtree with `'always'` / `'never'` for specific use cases.
 */
export function MotionConfig({
  reducedMotion = 'user',
  children,
}: {
  reducedMotion?: ReducedMotion
  children: ReactNode
}) {
  const value = useMemo<MotionConfigValue>(
    () => ({ reducedMotion }),
    [reducedMotion],
  )
  return (
    <MotionConfigContext.Provider value={value}>
      {children}
    </MotionConfigContext.Provider>
  )
}
