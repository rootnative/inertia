import type { ReactElement } from 'react'
import { Motion } from '../motion'
import { flushMotion, renderWithMotion } from '../testing'

type Rendered = ReturnType<typeof renderWithMotion>

// Updating props in the static-render mock takes two passes: `rerender` applies
// the new props and runs the value-driving effect (so shared values reach their
// new targets), then `flushMotion` re-reads `useAnimatedStyle` against that
// post-effect snapshot. Mirrors testing-helper.test.tsx's prop-change flush.
function update(result: Rendered, ui: ReactElement): void {
  result.rerender(ui)
  flushMotion(result, ui)
}

// Regression: the set of animated keys must EXPAND when `animate` gains a key
// after mount. The factory caches the touched-key set (so variant unions and
// gesture sub-states stay active across controller transitions, and the
// `useAnimatedStyle` worklet doesn't churn frame-to-frame), but the cache must
// grow when a render introduces a key it hasn't seen — otherwise a parent that
// changes `animate={{ opacity: 1 }}` to `animate={{ opacity: 1, scale: 2 }}`
// gets the new shared value updated but never rendered, because the worklet
// only iterates the frozen set. The set must never shrink.

function getStyle(
  node: { props: { style?: unknown } } | null,
): Record<string, unknown> {
  if (!node) return {}
  const raw = node.props.style
  const flat = Array.isArray(raw) ? raw.flat(Infinity) : [raw]
  return Object.assign({}, ...flat.filter(Boolean))
}

function transformOf(style: Record<string, unknown>): Record<string, unknown> {
  const t = style.transform as Array<Record<string, unknown>> | undefined
  if (!t) return {}
  return Object.assign({}, ...t)
}

describe('active key set — post-mount expansion', () => {
  it('animates a top-level key added to `animate` after mount', () => {
    const result = renderWithMotion(
      <Motion.View
        testID="box"
        animate={{ opacity: 1 }}
        transition={{ type: 'timing', duration: 100 }}
      />,
    )

    // The key was absent at mount; adding it on a later render must drive it.
    update(
      result,
      <Motion.View
        testID="box"
        animate={{ opacity: 1, width: 200 }}
        transition={{ type: 'timing', duration: 100 }}
      />,
    )

    const style = getStyle(result.toJSON() as never)
    expect(style.opacity).toBe(1)
    expect(style.width).toBe(200)
  })

  it('animates a transform key added to `animate` after mount', () => {
    const result = renderWithMotion(
      <Motion.View
        testID="box"
        animate={{ opacity: 1 }}
        transition={{ type: 'timing', duration: 100 }}
      />,
    )

    update(
      result,
      <Motion.View
        testID="box"
        animate={{ opacity: 1, scale: 2, translateX: 50 }}
        transition={{ type: 'timing', duration: 100 }}
      />,
    )

    const transform = transformOf(getStyle(result.toJSON() as never))
    expect(transform.scale).toBe(2)
    expect(transform.translateX).toBe(50)
  })

  it('keeps a key animating after it is removed from `animate` (set never shrinks)', () => {
    const result = renderWithMotion(
      <Motion.View
        testID="box"
        animate={{ opacity: 1, width: 200 }}
        transition={{ type: 'timing', duration: 100 }}
      />,
    )

    // Drop `width` — the key stays active so it can still be driven (e.g. back
    // toward a resting value); it must not vanish from the worklet's set.
    update(
      result,
      <Motion.View
        testID="box"
        animate={{ opacity: 0.5 }}
        transition={{ type: 'timing', duration: 100 }}
      />,
    )

    const style = getStyle(result.toJSON() as never)
    expect(style.opacity).toBe(0.5)
    // `width` SV still resolves and renders; the key wasn't dropped from the
    // active set.
    expect(style).toHaveProperty('width')
  })
})
