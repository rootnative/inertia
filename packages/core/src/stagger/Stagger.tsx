import { Children, isValidElement, type ReactNode } from 'react'
import { StaggerContext } from './StaggerContext'

export interface StaggerProps {
  children?: ReactNode
  /**
   * Milliseconds between consecutive children. Child `i` (in render order)
   * receives a delay of `delay + i * interval`.
   */
  interval: number
  /**
   * Base delay in milliseconds applied to every child before the interval,
   * so the whole cascade can start late without pushing the spacing into
   * each child. Defaults to `0`.
   */
  delay?: number
  /**
   * Which end of the child list starts the cascade. `'first'` (default)
   * staggers top-down in render order; `'last'` reverses it, so the final
   * child animates first.
   */
  from?: 'first' | 'last'
  /**
   * Turn the stagger on or off in one place. When `false`, every child gets
   * a delay of `0` — the single-switch escape hatch for "cascade in, but
   * not back out": pass `enabled={revealed}` and the hide direction snaps
   * together. Defaults to `true`.
   */
  enabled?: boolean
}

/**
 * Assign each child a stagger delay from its position, so a list entrance
 * cascades without every child computing `index * ms` itself.
 *
 * The parent owns the timing: reordering, filtering, or reversing the list
 * re-derives every delay from the new render order, and `enabled` turns the
 * whole cascade off in one place. Each child slot gets its own provider, so
 * a `Motion.*` primitive anywhere inside child `i`'s subtree inherits child
 * `i`'s delay.
 *
 * The delay applies to the declarative animations of the `Motion.*`
 * primitives underneath — the mount animation (`initial` → `animate`) and
 * any later `animate` change. It deliberately does not delay `gesture`
 * feedback, `<Presence>` exits, or reduced-motion snaps.
 *
 * `<Stagger>` renders no host view — only per-child context providers.
 */
export function Stagger({
  children,
  interval,
  delay = 0,
  from = 'first',
  enabled = true,
}: StaggerProps) {
  // `Children.toArray` drops `null` / `undefined` / booleans, so conditional
  // children don't leave holes in the cascade, and it assigns stable
  // element keys that the providers below reuse.
  const items = Children.toArray(children)
  const count = items.length
  return (
    <>
      {items.map((child, index) => {
        const position = from === 'last' ? count - 1 - index : index
        const childDelay = enabled ? delay + position * interval : 0
        const key = isValidElement(child) ? (child.key ?? index) : index
        return (
          <StaggerContext.Provider key={key} value={childDelay}>
            {child}
          </StaggerContext.Provider>
        )
      })}
    </>
  )
}
