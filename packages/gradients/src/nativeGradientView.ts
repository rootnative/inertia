import type { ComponentType } from 'react'

/**
 * The native view of expo-linear-gradient, on a platform where
 * `MotionLinearGradient` must animate it directly. Only Android needs it (see
 * `nativeGradientView.android.ts`); everywhere else the public
 * `LinearGradient` is the host of the animated props.
 */
export function nativeGradientView<
  P extends object,
>(): ComponentType<P> | null {
  return null
}
