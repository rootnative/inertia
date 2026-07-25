import { type CoordinateSpace, type SharedRect } from './sharedRegistry'

/**
 * Window-coordinate measurement for shared-element rects.
 *
 * ## Synchronous or not at all
 *
 * `measureInWindow` is callback-shaped but not reliably asynchronous, and the
 * difference decides this module's design:
 *
 * - **Fabric** (the default from RN 0.76, and our 0.81+ baseline) resolves it
 *   through a synchronous JSI call — the callback runs before
 *   `measureInWindow` returns.
 * - **Paper** goes over the bridge, so the callback lands a tick later.
 * - **A detached node calls back never at all.** Not an edge case and not a
 *   platform quirk: `ReactFabricHostComponent.measureInWindow` looks the node
 *   up and simply returns when it is missing. The Jest host mock behaves the
 *   same way.
 *
 * So this module reads the result **synchronously or treats it as
 * unavailable**, and ignores a callback that arrives late. That is not a
 * limitation to work around — it is what keeps the coordinate space coherent.
 * An implementation that awaited the callback would put Fabric in window space
 * and Paper in parent space *for the same element at different moments*, and
 * since the two spaces aren't comparable, a source stored in one and a target
 * measured in the other silently skips the transition. Better to be
 * consistently parent-relative on a platform that can't measure synchronously —
 * which is exactly how this worked before window coordinates existed.
 *
 * Net effect: nested-parent shared elements are fixed on Fabric, and on Paper
 * the behavior is unchanged rather than intermittently broken.
 *
 * ## Why the result is validated rather than trusted
 *
 * A node that is off-screen or laid out to nothing reports zeros (or `NaN` on
 * some platforms) instead of failing. Feeding that into a FLIP would fling the
 * element in from the top-left corner — far worse than not animating. Anything
 * unusable is reported as `undefined` so the caller falls back to the
 * parent-relative rect it already has.
 */

/** Raw measurement, before it is tagged with a coordinate space. */
export interface MeasuredRect {
  x: number
  y: number
  width: number
  height: number
}

/**
 * Measures `node` in window coordinates, or returns `undefined` when it can't
 * be measured synchronously. Swappable for tests via
 * `__setSharedLayoutMeasurer`.
 */
export type WindowMeasurer = (node: unknown) => MeasuredRect | undefined

type MeasureInWindowNode = {
  measureInWindow?: (
    callback: (x: number, y: number, width: number, height: number) => void,
  ) => void
}

const defaultMeasurer: WindowMeasurer = (node) => {
  const measure = (node as MeasureInWindowNode | null)?.measureInWindow
  if (typeof measure !== 'function') return undefined

  let result: MeasuredRect | undefined
  let returned = false
  try {
    measure.call(node, (x, y, width, height) => {
      // A callback that arrives after we've returned is Paper's asynchronous
      // bridge answering too late to use. Dropping it is deliberate: accepting
      // it would upgrade this element to window space while its counterpart
      // stays parent-relative, and mixed spaces cancel the transition.
      if (returned) return
      result = { x, y, width, height }
    })
  } catch {
    // Some hosts throw rather than no-op on a detached node.
    returned = true
    return undefined
  }
  returned = true
  return result
}

let measurer: WindowMeasurer = defaultMeasurer

function usable(rect: MeasuredRect): boolean {
  const { x, y, width, height } = rect
  for (const v of [x, y, width, height]) {
    if (typeof v !== 'number' || !Number.isFinite(v)) return false
  }
  // Zero-sized means "not really measurable" in practice — detached, or laid
  // out to nothing. Either way there is no FLIP to compute from it.
  return width !== 0 || height !== 0
}

/**
 * Measure `node` in window coordinates and tag the result, or return
 * `undefined` when no usable synchronous measurement is available.
 *
 * Validation lives here rather than in the default measurer so a swapped-in
 * measurer is held to the same contract — an unusable rect can never reach a
 * FLIP, however it was produced.
 */
export function measureWindowRect(node: unknown): SharedRect | undefined {
  const measured = measurer(node)
  if (!measured || !usable(measured)) return undefined
  return toSharedRect(measured, 'window')
}

/** Tag a raw measurement with its coordinate space. */
export function toSharedRect(
  rect: MeasuredRect,
  space: CoordinateSpace,
): SharedRect {
  return { ...rect, space }
}

/**
 * Test hook: swap the measurement implementation. Pass `undefined` to restore
 * the real `measureInWindow` path. Not exported from the package root —
 * reachable only from inside the workspace.
 *
 * Needed because the Jest host mock's `measureInWindow` never invokes its
 * callback, so without an override every test would exercise only the
 * parent-relative fallback — which is also, deliberately, what a consumer's
 * test suite sees.
 */
export function __setSharedLayoutMeasurer(
  fn: WindowMeasurer | undefined,
): void {
  measurer = fn ?? defaultMeasurer
}
