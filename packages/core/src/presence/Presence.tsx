import {
  Children,
  isValidElement,
  type Key,
  type ReactElement,
  type ReactNode,
  useCallback,
  useMemo,
  useRef,
  useState,
} from 'react'
import { PresenceContext, type PresenceContextValue } from './PresenceContext'

interface RenderEntry {
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

  // Snapshot of elements removed from `incoming` whose exit animation is
  // still in flight. setExiting is called synchronously during render below
  // (the documented pattern for derived-from-prop-change state), so React
  // re-renders with the new snapshot before committing — no visual frame
  // where the departing child has vanished.
  const [exiting, setExiting] = useState<Map<Key, ReactElement>>(
    () => new Map(),
  )

  // Tracks the previous render's `incoming` so we can diff. Updated
  // synchronously alongside the setState call.
  const prevIncomingRef = useRef<ReactElement[]>(incoming)

  if (prevIncomingRef.current !== incoming) {
    const prev = prevIncomingRef.current
    prevIncomingRef.current = incoming
    const incomingKeys = new Set(incoming.map((el) => el.key as Key))
    let next: Map<Key, ReactElement> | null = null
    const ensureMutable = () => {
      if (!next) next = new Map(exiting)
      return next
    }

    // Departures: in prev but not in current → snapshot for exit.
    for (const oldEl of prev) {
      const key = oldEl.key as Key
      if (!incomingKeys.has(key) && !exiting.has(key)) {
        ensureMutable().set(key, oldEl)
      }
    }
    // Returns: was exiting and reappears → drop the snapshot. The live
    // `incoming` entry takes over with the same key, so React reconciles
    // the underlying Motion instance and the in-flight exit animation
    // interrupts back toward `animate` values.
    for (const el of incoming) {
      const key = el.key as Key
      if (exiting.has(key)) {
        ensureMutable().delete(key)
      }
    }

    if (next) setExiting(next)
  }

  const handleRemove = useCallback((key: Key) => {
    setExiting((prev) => {
      if (!prev.has(key)) return prev
      const next = new Map(prev)
      next.delete(key)
      return next
    })
  }, [])

  // Single combined render list. Putting `incoming` and `exiting` entries in
  // one array (rather than two `.map` calls inside a fragment) ensures React
  // reconciles by `key` across positions — when an entry moves from
  // present-list to exiting-list, the component instance persists.
  const renderList: RenderEntry[] = []
  for (const el of incoming) {
    renderList.push({
      key: el.key as Key,
      element: el,
      isPresent: true,
    })
  }
  for (const [key, el] of exiting) {
    if (!renderList.some((entry) => entry.key === key)) {
      renderList.push({ key, element: el, isPresent: false })
    }
  }

  return (
    <>
      {renderList.map(({ key, element, isPresent }) => (
        <PresenceItem
          key={key}
          itemKey={key}
          isPresent={isPresent}
          onRemove={handleRemove}
        >
          {element}
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
