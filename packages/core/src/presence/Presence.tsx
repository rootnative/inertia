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

  // Render order from the previous pass, *including* entries that were already
  // exiting. An exiting child is by definition absent from `incoming`, so this
  // is the only record of where it sat among its siblings.
  const orderRef = useRef<Key[]>([])

  // The exiting map this render should actually render with. On the render
  // that detects a departure, `exiting` state is still the pre-departure map —
  // `setExiting` below schedules the update but doesn't apply it here. Ordering
  // has to see the departure immediately: if it doesn't, the key is missing
  // from `orderRef` on the *next* render too, and the walk below (which only
  // visits keys it remembers) would drop the child entirely instead of just
  // misplacing it.
  let pendingExiting: Map<Key, ReactElement> | null = null

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

    if (next) {
      pendingExiting = next
      setExiting(next)
    }
  }

  const activeExiting = pendingExiting ?? exiting

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
  //
  // Exiting entries are spliced back in at the position they held, not
  // appended. React reconciles this array by key, so appending *moves* the
  // node: removing the middle of `a, b, c` rendered `a, c, b` and the
  // departing row visibly jumped to the end before it had finished animating
  // out. Absolutely-positioned overlays (popovers, sheets) never showed it;
  // any list or column did.
  const byKey = new Map<Key, ReactElement>()
  const presentKeys = new Set<Key>()
  const order: Key[] = []
  for (const el of incoming) {
    const key = el.key as Key
    byKey.set(key, el)
    presentKeys.add(key)
    order.push(key)
  }

  // Walk the remembered order so that several adjacent departures keep their
  // relative order, and anchor each one immediately after the nearest
  // preceding sibling that is still rendered. No surviving predecessor means
  // it was at the front, so it goes back to the front.
  const prevOrder = orderRef.current
  for (let i = 0; i < prevOrder.length; i++) {
    const key = prevOrder[i]!
    const departing = activeExiting.get(key)
    if (!departing || byKey.has(key)) continue
    let insertAt = 0
    for (let j = i - 1; j >= 0; j--) {
      const anchor = order.indexOf(prevOrder[j]!)
      if (anchor !== -1) {
        insertAt = anchor + 1
        break
      }
    }
    byKey.set(key, departing)
    order.splice(insertAt, 0, key)
  }

  // Safety net: an exiting child the remembered order never saw still has to
  // render, or it would unmount with no exit animation at all. Appending is
  // the old (wrong-position) behaviour, which is strictly better than dropping
  // it — in practice `activeExiting` keeps this loop empty.
  for (const [key, el] of activeExiting) {
    if (byKey.has(key)) continue
    byKey.set(key, el)
    order.push(key)
  }

  orderRef.current = order

  // A live `incoming` entry always wins: a key that returns mid-exit is
  // present again, and the same instance interrupts back toward `animate`.
  const renderList: RenderEntry[] = order.map((key) => ({
    key,
    element: byKey.get(key)!,
    isPresent: presentKeys.has(key),
  }))

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
