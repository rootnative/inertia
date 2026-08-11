import { Text } from 'react-native'
import { render, screen } from '@testing-library/react-native'
import { MotionFlatList } from '../index'
import { Motion } from '../motion'
import { renderWithMotion } from '../testing'
import { useScroll } from '../values/useScroll'

// `Motion.FlatList` exists to close the gap that forced consumers to choose
// between virtualization and scroll-driven animation: `useScroll` needs a
// Reanimated animated component, and before this primitive the only animated
// scroller was `Motion.ScrollView`, which mounts every row.
//
// What is and isn't observable here: the mock resolves animations
// synchronously, so these assert structure and prop plumbing, not frames. The
// `scrollEventThrottle` default that motivates building on
// `Animated.FlatList` is a real-Reanimated behavior the mock does not model —
// it is pinned by the type/composition choice, not by this file.

type Row = { id: string; label: string }

const DATA: Row[] = [
  { id: 'a', label: 'Alpha' },
  { id: 'b', label: 'Bravo' },
  { id: 'c', label: 'Charlie' },
]

const keyExtractor = (item: Row) => item.id
const renderItem = ({ item }: { item: Row }) => <Text>{item.label}</Text>

describe('Motion.FlatList', () => {
  it('is reachable from the namespace, the barrel, and the subpath', () => {
    // The barrel re-export was missed on the first pass — `Motion.FlatList`
    // worked while `import { MotionFlatList }` was undefined. Cheap to pin.
    expect(Motion.FlatList).toBeDefined()
    expect(MotionFlatList).toBeDefined()
    expect(Motion.FlatList).toBe(MotionFlatList)
  })

  it('renders rows through renderItem', () => {
    render(
      <Motion.FlatList
        data={DATA}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
      />,
    )

    expect(screen.getByText('Alpha')).toBeTruthy()
    expect(screen.getByText('Charlie')).toBeTruthy()
  })

  it('animates the scroll container while keeping list props intact', () => {
    // The whole point of the primitive: animation props and virtualization
    // props coexist on one component. Before this existed, a consumer had to
    // pick one (see the MovieCarousel-vs-MovieRow tradeoff that surfaced it).
    // `renderWithMotion` flushes to the animate target; a bare `render` would
    // observe the `initial` snapshot (the mock is static-render).
    renderWithMotion(
      <Motion.FlatList
        testID="list"
        data={DATA}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ type: 'timing', duration: 100 }}
      />,
    )

    // Rows still render — the animated path did not swallow `data`/`renderItem`.
    expect(screen.getByText('Bravo')).toBeTruthy()

    const style = screen.getByTestId('list').props.style
    const flat = (Array.isArray(style) ? style : [style]).filter(Boolean)
    const merged = Object.assign({}, ...flat.flat(Infinity).filter(Boolean))
    expect(merged.opacity).toBe(1)
  })

  it('accepts a useScroll handler on onScroll', () => {
    // This is the assertion that the reported gap is closed. `useScroll`'s
    // handler is an opaque worklet bag that only functions on a Reanimated
    // animated component; reaching the host at all is what was impossible
    // with a bare RN FlatList.
    function Harness() {
      const { onScroll } = useScroll()
      return (
        <Motion.FlatList
          testID="list"
          data={DATA}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          onScroll={onScroll}
          scrollEventThrottle={16}
        />
      )
    }

    render(<Harness />)

    const host = screen.getByTestId('list')
    expect(typeof host.props.onScroll).toBe('function')
    expect(host.props.scrollEventThrottle).toBe(16)
  })

  it('routes a prop-less instance through the plain host', () => {
    // Same zero-cost guarantee every other primitive has: no animation prop
    // means no shared values, no worklet, no gesture state.
    render(
      <Motion.FlatList
        testID="list"
        data={DATA}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
      />,
    )

    expect(screen.getByTestId('list')).toBeTruthy()
    expect(screen.getByText('Alpha')).toBeTruthy()
  })

  it('composes a user onLayout rather than replacing it', () => {
    // FlatList's own viewport measurement rides `onLayout`
    // (`VirtualizedList._onLayout`), and the factory overwrites the prop with
    // its shared-layout handler. That handler calls the user's first
    // (useSharedLayout.ts), so virtualization survives — this pins it, because
    // a regression here would silently break windowing rather than error.
    const onLayout = jest.fn()

    render(
      <Motion.FlatList
        testID="list"
        data={DATA}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        animate={{ opacity: 1 }}
        onLayout={onLayout}
      />,
    )

    const host = screen.getByTestId('list')
    host.props.onLayout({
      nativeEvent: { layout: { x: 0, y: 0, width: 320, height: 480 } },
    })

    expect(onLayout).toHaveBeenCalledTimes(1)
  })
})
