import { createContext, useContext } from 'react'

/**
 * Per-child stagger delay in milliseconds, provided by `<Stagger>`. `0`
 * outside a `<Stagger>` (or under a disabled one), which every consumer
 * treats as "no stagger".
 *
 * Internal wiring — consumers use `<Stagger>`; custom animated components
 * read the value through `useStaggerDelay()`.
 */
export const StaggerContext = createContext(0)

/**
 * The stagger delay (in milliseconds) assigned to this element's child slot
 * by the nearest `<Stagger>` ancestor. `0` when there is none, when the
 * stagger is disabled, or for the first child of a zero-`delay` stagger.
 *
 * The `Motion.*` primitives consume this automatically. Custom animated
 * components built on `resolveTransition` / `resolveAnimatableValue` call
 * this hook and add the returned value to their animation delay so they
 * participate in a `<Stagger>` the same way the built-in primitives do.
 */
export function useStaggerDelay(): number {
  return useContext(StaggerContext)
}
