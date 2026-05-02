import { useMemo, useRef } from 'react'
import { type VariantController } from '../types'

/**
 * Build a controller for a variants map. The controller is the imperative
 * escape hatch — pass it to a Motion primitive via `controller={...}` and
 * call `controller.transitionTo('open')` from event handlers, async chains,
 * etc. The hook name mirrors the prop name (`variants`) so the relationship
 * is obvious.
 *
 * The controller is identity-stable across renders. State changes are
 * delivered to subscribers via `subscribe` — Motion primitives subscribe
 * internally and re-resolve `animate` on each transition.
 */
export function useVariants<V extends Readonly<Record<string, object>>>(
  variants: V,
  initial?: keyof V & string,
): VariantController<keyof V & string> {
  // Pin the variants object reference for the lifetime of the controller.
  // Consumers shouldn't recreate the map on every render anyway, but if they
  // do, the controller still works against the first definition's keys.
  const variantsRef = useRef(variants)

  return useMemo(() => {
    const listeners = new Set<(next: keyof V & string) => void>()
    let current =
      initial ??
      ((Object.keys(variantsRef.current)[0] ?? '') as keyof V & string)

    const controller: VariantController<keyof V & string> = {
      get current() {
        return current
      },
      transitionTo(next) {
        if (next === current) return
        if (!(next in variantsRef.current)) {
          if (__DEV__) {
            console.warn(
              `[inertia] useVariants: unknown variant "${String(next)}". Known keys: ${Object.keys(variantsRef.current).join(', ')}`,
            )
          }
          return
        }
        current = next
        for (const fn of listeners) fn(next)
      },
      subscribe(listener) {
        listeners.add(listener)
        return () => {
          listeners.delete(listener)
        }
      },
    }
    return controller
    // Identity-stable controller — only build once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}

declare const __DEV__: boolean
