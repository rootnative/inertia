import { createContext, useContext } from 'react'

/**
 * Per-child contract between `<Presence>` and its descendant Motion
 * primitives. `<Presence>` provides a fresh value to each rendered child;
 * Motion primitives consume it to gate exit animations.
 *
 * - `isPresent`: `true` while the child is in the incoming children list.
 *   Flips to `false` when the parent removes it; the child remains rendered
 *   until `safeToRemove` is called.
 * - `safeToRemove`: callback the child invokes when its exit animation has
 *   settled. `<Presence>` then drops the snapshot entry and unmounts.
 */
export interface PresenceContextValue {
  isPresent: boolean
  safeToRemove: () => void
}

export const PresenceContext = createContext<PresenceContextValue | null>(null)

/**
 * Read the surrounding `<Presence>` contract from a child component. Returns
 * `null` when there is no `<Presence>` ancestor — useful for components that
 * want to support both standalone and Presence-wrapped use without branching.
 */
export function usePresence(): PresenceContextValue | null {
  return useContext(PresenceContext)
}
