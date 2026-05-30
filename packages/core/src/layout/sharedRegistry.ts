/**
 * Module-level registry of last-known on-screen rects for shared-layout
 * elements, indexed by `layoutId`. Backs `<Motion.* layoutId="..." />` —
 * Reanimated 4 dropped the `sharedTransitionTag` API the previous design
 * relied on, so the cross-screen shared-element transition lives in
 * userland now.
 *
 * Lifecycle, per id:
 *   1. While a Motion primitive with `layoutId={id}` is mounted, every
 *      `onLayout` updates the rect via `registerLayout`.
 *   2. When that primitive unmounts, the same rect is left behind under a
 *      TTL via `releaseLayout` so a subsequent mount can consume it.
 *   3. The next mount calls `consumeLayout(id)` — if a fresh entry exists
 *      it becomes the FLIP source rect; the entry is removed so a third
 *      mount with the same id doesn't re-animate from a stale snapshot.
 *
 * Rects are stored in **parent-relative coordinates** (what `onLayout`'s
 * `nativeEvent.layout` reports). This composes for the common case where the
 * source and target share an outer content container — e.g. a typical stack
 * navigator. Nested-parent setups, where the two parents sit at different
 * window offsets, need a window-coordinate path (`measureInWindow`); that is
 * punted to v2 per the roadmap.
 */

/** Parent-relative rect of a measured element (from `onLayout`). */
export interface SharedRect {
  x: number
  y: number
  width: number
  height: number
}

interface Entry {
  rect: SharedRect
  expiresAt: number
}

const REGISTRY = new Map<string, Entry>()

/**
 * How long (ms) a released rect remains consumable. Sized to comfortably
 * cover a typical screen transition (slide animation, gesture-driven
 * dismiss) without leaving stale entries lying around if no incoming
 * mount picks them up.
 */
export const SHARED_LAYOUT_TTL_MS = 1000

/**
 * Provide the current monotonic-ish timestamp. Indirected so tests can
 * stub it via `__setSharedLayoutClock` without touching `Date.now` globally.
 */
let now = (): number => Date.now()

/**
 * Update the latest known rect for `id`. Called on every `onLayout` of a
 * Motion primitive with `layoutId` set so the registry always holds a
 * current measurement if that primitive becomes the source of a future
 * transition. Resets the TTL each call.
 */
export function registerLayout(id: string, rect: SharedRect): void {
  REGISTRY.set(id, { rect, expiresAt: now() + SHARED_LAYOUT_TTL_MS })
}

/**
 * Record the rect for `id` on unmount so the next mount can consume it as
 * the FLIP source. Functionally identical to `registerLayout` — the split
 * is purely intent-documenting at the call site.
 */
export function releaseLayout(id: string, rect: SharedRect): void {
  REGISTRY.set(id, { rect, expiresAt: now() + SHARED_LAYOUT_TTL_MS })
}

/**
 * Take the recorded rect for `id` if it exists and hasn't expired. The
 * entry is removed in either case — at most one incoming mount consumes
 * a given release, and an expired entry is dropped so it can't poison a
 * later transition. Returns `undefined` when no fresh source is available,
 * in which case the caller should mount without a layout animation.
 */
export function consumeLayout(id: string): SharedRect | undefined {
  const entry = REGISTRY.get(id)
  if (!entry) return undefined
  REGISTRY.delete(id)
  if (entry.expiresAt < now()) return undefined
  return entry.rect
}

/** Drop all entries. Tests use this to isolate between cases. */
export function clearSharedRegistry(): void {
  REGISTRY.clear()
}

/**
 * Inspect a registry entry without consuming it. Intended for tests and
 * dev tooling; production code should go through `consumeLayout`.
 */
export function peekSharedLayout(id: string): SharedRect | undefined {
  const entry = REGISTRY.get(id)
  if (!entry) return undefined
  if (entry.expiresAt < now()) return undefined
  return entry.rect
}

/**
 * Test hook: swap the clock used for TTL calculations. Pass `undefined` to
 * restore `Date.now`. Not exported from the package root — reachable only
 * from inside the workspace.
 */
export function __setSharedLayoutClock(fn: (() => number) | undefined): void {
  now = fn ?? Date.now
}
