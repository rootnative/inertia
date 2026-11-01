import type { ComponentType } from 'react'
import { requireNativeView } from 'expo'

// expo-linear-gradient puts this view inside a plain `View` on Android, and
// Reanimated sends `animatedProps` to that outer view, which ignores them.
// The view name and its prop shapes are internal to expo-linear-gradient: the
// peer range holds one major, and a test pins the shapes.
export function nativeGradientView<
  P extends object,
>(): ComponentType<P> | null {
  return requireNativeView<P>('ExpoLinearGradient')
}
