import { useContext, useEffect, useId, useMemo } from 'react'
import { PresenceContext, type PresenceContextValue } from './PresenceContext'
import { PresenceRegistryContext } from './PresenceRegistry'

export {
  PresenceRegistryContext,
  type PresenceRegistry,
} from './PresenceRegistry'

/**
 * `usePresence()` for a `Motion.*` instance. `safeToRemove` releases this
 * instance only, and `<Presence>` removes the child when every `Motion.*`
 * registered under it has released, so a nested `Motion.*` with no `exit` or
 * a shorter `exit` cannot cut the exit of its ancestor. The registration
 * effect must run before the effect that releases, so call this hook before
 * any effect that can call `safeToRemove`.
 */
export function useMotionPresence(): PresenceContextValue | null {
  const presence = useContext(PresenceContext)
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
