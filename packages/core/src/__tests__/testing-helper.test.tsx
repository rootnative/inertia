import { render } from '@testing-library/react-native'
import { Motion } from '../motion'
import { flushMotion, renderWithMotion } from '../testing'

// Phase-3 polish: the test helper exposed at `@onlynative/inertia/testing`
// must let consumers assert on **target** styles without manually triggering
// a re-render to flush the static-render Reanimated mock.
//
// The mock captures `useAnimatedStyle` once at mount, so plain `render(...)`
// returns the at-rest (initial) styles. `renderWithMotion` re-renders once
// after effects fire so the next `useAnimatedStyle` invocation sees the
// post-`withSpring` / `withTiming` shared-value snapshot.

function getStyle(
  node: { props: { style?: unknown } } | null,
): Record<string, unknown> {
  if (!node) return {}
  const raw = node.props.style
  // RN flattens nested arrays at runtime; collapse them here for assertions.
  const flat = Array.isArray(raw) ? raw.flat(Infinity) : [raw]
  return Object.assign({}, ...flat.filter(Boolean))
}

describe('renderWithMotion / flushMotion', () => {
  it('exposes target opacity instead of initial', () => {
    const result = renderWithMotion(
      <Motion.View
        testID="card"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ type: 'spring' }}
      />,
    )

    const style = getStyle(result.toJSON() as never)
    expect(style.opacity).toBe(1)
  })

  it('plain render() leaves styles at initial — the helper is necessary', () => {
    // Documenting the difference: this is the footgun the helper exists to
    // paper over. If a future Reanimated mock change makes `render()` flush
    // automatically, we can deprecate `renderWithMotion`.
    const result = render(
      <Motion.View
        testID="card"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ type: 'spring' }}
      />,
    )

    const style = getStyle(result.toJSON() as never)
    expect(style.opacity).toBe(0)
  })

  it('flushMotion re-flushes after a prop change', () => {
    const result = renderWithMotion(
      <Motion.View
        testID="card"
        animate={{ opacity: 0.4 }}
        transition={{ type: 'spring' }}
      />,
    )
    expect(getStyle(result.toJSON() as never).opacity as number).toBe(0.4)

    const next = (
      <Motion.View
        testID="card"
        animate={{ opacity: 0.9 }}
        transition={{ type: 'spring' }}
      />
    )
    result.rerender(next)
    flushMotion(result, next)
    expect(getStyle(result.toJSON() as never).opacity as number).toBe(0.9)
  })

  it('flushes transform-axis targets too', () => {
    const result = renderWithMotion(
      <Motion.View
        testID="card"
        initial={{ translateX: 0, scale: 1 }}
        animate={{ translateX: 100, scale: 1.5 }}
        transition={{ type: 'spring' }}
      />,
    )

    const style = getStyle(result.toJSON() as never)
    const transform = style.transform as Array<Record<string, number>>
    expect(transform).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ translateX: 100 }),
        expect.objectContaining({ scale: 1.5 }),
      ]),
    )
  })
})
