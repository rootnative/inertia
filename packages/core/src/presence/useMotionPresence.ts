import { createContext, useContext, useEffect, useId, useMemo } from 'react'
import { type PresenceContextValue, usePresence } from './PresenceContext'

export interface PresenceRegistry {
  register: (id: string) => () => void
  release: (id: string) => void
}

/**
 * Internal to the `Motion.*` primitives. `<Presence>` removes an exiting child
 * only when every `Motion.*` registered under it has released, so a nested
 * `Motion.*` with no `exit` or a shorter `exit` cannot cut the exit of its
 * ancestor. The public `usePresence().safeToRemove` keeps its old contract and
 * removes the child at once.
 */
export const PresenceRegistryContext = createContext<PresenceRegistry | null>(
  null,
)

/**
 * `usePresence()` for a `Motion.*` instance. `safeToRemove` releases this
 * instance only. The registration effect must run before the effect that
 * releases, so call this hook before any effect that can call `safeToRemove`.
 */
export function useMotionPresence(): PresenceContextValue | null {
  const presence = usePresence()
  const registry = useContext(PresenceRegistryContext)
  const id = useId()

  useEffect(() => registry?.register(id), [registry, id])

  return useMemo(() => {
    if (presence === null) return null
    if (registry === null) return presence
    return {
      isPresent: presence.isPresent,
      safeToRemove: () => registry.release(id),
    }
  }, [presence, registry, id])
}
