import { createContext } from 'react'

/**
 * Internal to `<Presence>` and the hooks under it. A `Motion.*` registers and
 * releases; a `usePresence()` consumer observes. `<Presence>` removes an
 * exiting child when every registered `Motion.*` has released. A child with
 * no registration and no observer has nothing to wait for, so it is removed
 * the moment it departs.
 */
export interface PresenceRegistry {
  register: (id: string) => () => void
  release: (id: string) => void
  observe: (id: string) => () => void
}

export const PresenceRegistryContext = createContext<PresenceRegistry | null>(
  null,
)
