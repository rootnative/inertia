import {
  Children,
  isValidElement,
  type Key,
  type ReactElement,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { PresenceContext, type PresenceContextValue } from './PresenceContext'

interface RenderedItem {
  key: Key
  element: ReactElement
  isPresent: boolean
}

/**
 * Wrap a list of children with mount / unmount transitions. When a child is
 * removed from the incoming list it stays in the snapshot until its exit
 * animation completes; descendants consume the per-child `<PresenceContext>`
 * to coordinate.
 *
 * Children must be `<Motion.*>` primitives (or any component that consumes
 * `usePresence()` and calls `safeToRemove`). Plain elements without that
 * contract will linger in the snapshot once removed; document that and pick
 * the right primitive.
 *
 * Children also need explicit `key`s so removal is detectable across
 * renders. Without a key, React falls back to positional identity and
 * removal looks like a prop change — Presence has nothing to mark exiting.
 */
export function Presence({ children }: { children: ReactNode }) {
  const incoming = useMemo(() => {
    const out: ReactElement[] = []
    Children.forEach(children, (child) => {
      if (!isValidElement(child)) return
      if (child.key === null) {
        if (__DEV__) {
          console.warn(
            '[inertia] <Presence> children must have a `key`. Skipping a keyless child.',
          )
        }
        return
      }
      out.push(child)
    })
    return out
  }, [children])

  const [rendered, setRendered] = useState<RenderedItem[]>(() =>
    incoming.map((el) => ({
      key: el.key as Key,
      element: el,
      isPresent: true,
    })),
  )

  // Reconcile incoming → rendered. New keys append (entering); missing keys
  // flip `isPresent: false` (exiting); still-present keys swap in the latest
  // element so prop changes pass through.
  useEffect(() => {
    setRendered((prev) => {
      const incomingByKey = new Map(incoming.map((el) => [el.key as Key, el]))
      const renderedKeys = new Set(prev.map((r) => r.key))

      let changed = false
      const next: RenderedItem[] = prev.map((r) => {
        const fresh = incomingByKey.get(r.key)
        if (fresh) {
          if (!r.isPresent) {
            // Re-added before exit completed: cancel the exit and re-promote.
            changed = true
            return { key: r.key, element: fresh, isPresent: true }
          }
          if (fresh !== r.element) {
            return { key: r.key, element: fresh, isPresent: true }
          }
          return r
        }
        if (r.isPresent) {
          changed = true
          return { ...r, isPresent: false }
        }
        return r
      })

      for (const el of incoming) {
        const key = el.key as Key
        if (!renderedKeys.has(key)) {
          next.push({ key, element: el, isPresent: true })
          changed = true
        }
      }

      return changed ? next : prev
    })
  }, [incoming])

  const handleRemove = useCallback((key: Key) => {
    setRendered((prev) => prev.filter((r) => r.key !== key))
  }, [])

  return (
    <>
      {rendered.map((r) => (
        <PresenceItem
          key={r.key}
          itemKey={r.key}
          isPresent={r.isPresent}
          onRemove={handleRemove}
        >
          {r.element}
        </PresenceItem>
      ))}
    </>
  )
}

function PresenceItem({
  itemKey,
  isPresent,
  onRemove,
  children,
}: {
  itemKey: Key
  isPresent: boolean
  onRemove: (key: Key) => void
  children: ReactNode
}) {
  const value = useMemo<PresenceContextValue>(
    () => ({
      isPresent,
      safeToRemove: () => onRemove(itemKey),
    }),
    [isPresent, itemKey, onRemove],
  )
  return (
    <PresenceContext.Provider value={value}>
      {children}
    </PresenceContext.Provider>
  )
}

declare const __DEV__: boolean
