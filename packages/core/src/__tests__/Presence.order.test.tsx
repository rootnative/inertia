import { render, screen } from '@testing-library/react-native'
import { Text } from 'react-native'
import { Motion, Presence } from '../index'

// Regression: an exiting child must animate out *in place*.
//
// The render list used to be built as "all present entries, then all exiting
// entries". React reconciles that array by key, so appending physically moves
// the node — removing the middle of `a, b, c` rendered `a, c, b` and the
// departing row jumped to the bottom before it had finished fading. Overlays
// (popovers, sheets) never showed it because they're absolutely positioned;
// every list and column did.
//
// A long exit transition keeps each departing child in the snapshot for the
// duration of the assertion — with the synchronous test mock, a child with no
// `exit` prop would call `safeToRemove` immediately and never be observable.

function Row({ id }: { id: string }) {
  return (
    <Motion.View
      key={id}
      testID={id}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ type: 'timing', duration: 10_000 }}
    >
      <Text>{id}</Text>
    </Motion.View>
  )
}

function List({ ids }: { ids: string[] }) {
  return (
    <Presence>
      {ids.map((id) => (
        <Row key={id} id={id} />
      ))}
    </Presence>
  )
}

/** Rendered sibling order, read off the tree rather than off our own state. */
function order(): string[] {
  return screen
    .getAllByTestId(/^[a-z]$/)
    .map((node) => (node.props as { testID: string }).testID)
}

describe('Presence — exiting children hold their position', () => {
  it('keeps a departing middle child between its siblings', () => {
    const { rerender } = render(<List ids={['a', 'b', 'c']} />)
    expect(order()).toEqual(['a', 'b', 'c'])

    rerender(<List ids={['a', 'c']} />)
    expect(order()).toEqual(['a', 'b', 'c'])
  })

  it('keeps a departing first child at the front', () => {
    const { rerender } = render(<List ids={['a', 'b', 'c']} />)
    rerender(<List ids={['b', 'c']} />)
    expect(order()).toEqual(['a', 'b', 'c'])
  })

  it('keeps a departing last child at the end', () => {
    const { rerender } = render(<List ids={['a', 'b', 'c']} />)
    rerender(<List ids={['a', 'b']} />)
    expect(order()).toEqual(['a', 'b', 'c'])
  })

  it('preserves the relative order of adjacent departures', () => {
    const { rerender } = render(<List ids={['a', 'b', 'c', 'd']} />)
    rerender(<List ids={['a', 'd']} />)
    expect(order()).toEqual(['a', 'b', 'c', 'd'])
  })

  it('preserves the order of non-adjacent departures', () => {
    const { rerender } = render(<List ids={['a', 'b', 'c', 'd', 'e']} />)
    rerender(<List ids={['c']} />)
    expect(order()).toEqual(['a', 'b', 'c', 'd', 'e'])
  })

  it('handles every child departing at once', () => {
    const { rerender } = render(<List ids={['a', 'b', 'c']} />)
    rerender(<List ids={[]} />)
    expect(order()).toEqual(['a', 'b', 'c'])
  })

  it('holds departures across a further unrelated re-render', () => {
    const { rerender } = render(<List ids={['a', 'b', 'c']} />)
    rerender(<List ids={['a', 'c']} />)
    // A second pass runs the diff again with `b` already in state rather than
    // freshly detected — position must survive that transition.
    rerender(<List ids={['a', 'c']} />)
    expect(order()).toEqual(['a', 'b', 'c'])
  })

  it('places a new sibling added while another is exiting', () => {
    const { rerender } = render(<List ids={['a', 'b', 'c']} />)
    rerender(<List ids={['a', 'c', 'd']} />)
    expect(order()).toEqual(['a', 'b', 'c', 'd'])
  })

  it('returns a re-added child to its live position', () => {
    const { rerender } = render(<List ids={['a', 'b', 'c']} />)
    rerender(<List ids={['a', 'c']} />)
    expect(order()).toEqual(['a', 'b', 'c'])

    // `b` comes back mid-exit: it is present again, not a snapshot.
    rerender(<List ids={['a', 'b', 'c']} />)
    expect(order()).toEqual(['a', 'b', 'c'])
  })

  it('reorders survivors while an exiting child holds its slot', () => {
    const { rerender } = render(<List ids={['a', 'b', 'c']} />)
    rerender(<List ids={['c', 'a']} />)
    // `b` anchors after `a`, its nearest surviving predecessor.
    expect(order()).toEqual(['c', 'a', 'b'])
  })
})

describe('Presence — exit completion still removes the child', () => {
  // No `exit` prop: the child has nothing to animate, so it reports
  // `safeToRemove` immediately and must leave the tree rather than linger in
  // the order snapshot forever.
  function Plain({ ids }: { ids: string[] }) {
    return (
      <Presence>
        {ids.map((id) => (
          <Motion.View key={id} testID={id} animate={{ opacity: 1 }}>
            <Text>{id}</Text>
          </Motion.View>
        ))}
      </Presence>
    )
  }

  it('drops the child once its exit resolves', () => {
    const { rerender } = render(<Plain ids={['a', 'b', 'c']} />)
    expect(order()).toEqual(['a', 'b', 'c'])

    rerender(<Plain ids={['a', 'c']} />)
    expect(order()).toEqual(['a', 'c'])
    expect(screen.queryByTestId('b')).toBeNull()
  })

  it('does not resurrect a removed key on later renders', () => {
    const { rerender } = render(<Plain ids={['a', 'b', 'c']} />)
    rerender(<Plain ids={['a', 'c']} />)
    rerender(<Plain ids={['c']} />)
    expect(order()).toEqual(['c'])
  })
})
