import { act, render, screen } from '@testing-library/react-native'
import { useEffect, useState } from 'react'
import { Text, View } from 'react-native'
import * as Reanimated from 'react-native-reanimated'
import { Motion, Presence, usePresence } from '../index'

// A departing child is removed when every `Motion.*` under it has released.
// A child with no `Motion.*` registered nothing, so nothing released, and the
// child stayed in the exiting map for good: a loading placeholder drawn in a
// plain `View` stayed on screen beside the content that replaced it. Such a
// child now leaves at once. A `usePresence()` consumer keeps the old contract:
// the child waits for its `safeToRemove`.

type SettleCallback = (finished?: boolean) => void
type WithSpy = jest.SpyInstance<unknown, [unknown, unknown, unknown?]>

function settle(spy: WithSpy, from: number) {
  const callbacks = spy.mock.calls
    .slice(from)
    .map((call) => call[2] as SettleCallback | undefined)
    .filter((cb): cb is SettleCallback => cb !== undefined)
  expect(callbacks.length).toBeGreaterThan(0)
  act(() => {
    for (const cb of callbacks) cb(true)
  })
}

function Screen({ loading }: { loading: boolean }) {
  return (
    <Presence>
      {loading ? (
        <View key="loading" testID="loading">
          <Text>Loading</Text>
        </View>
      ) : (
        <View key="content" testID="content" />
      )}
    </Presence>
  )
}

let withTiming: WithSpy

beforeEach(() => {
  jest.restoreAllMocks()
  withTiming = jest.spyOn(Reanimated, 'withTiming') as WithSpy
})

describe('<Presence> — a child with no Motion.*', () => {
  it('removes a plain View at once when it departs', () => {
    const { rerender } = render(<Screen loading />)
    expect(screen.queryByTestId('loading')).not.toBeNull()

    rerender(<Screen loading={false} />)
    expect(screen.queryByTestId('loading')).toBeNull()
    expect(screen.queryByTestId('content')).not.toBeNull()
  })

  it('removes a plain View from a list at once', () => {
    const List = ({ keys }: { keys: string[] }) => (
      <Presence>
        {keys.map((key) => (
          <View key={key} testID={key} />
        ))}
      </Presence>
    )
    const { rerender } = render(<List keys={['a', 'b', 'c']} />)
    rerender(<List keys={['a', 'c']} />)
    expect(screen.queryByTestId('b')).toBeNull()
    expect(screen.queryByTestId('a')).not.toBeNull()
    expect(screen.queryByTestId('c')).not.toBeNull()
  })

  it('a plain View that holds a Motion.* waits for its exit', () => {
    const Wrapped = ({ visible }: { visible: boolean }) => (
      <Presence>
        {visible ? (
          <View key="card" testID="card">
            <Motion.View
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ type: 'timing', duration: 10_000 }}
            />
          </View>
        ) : null}
      </Presence>
    )
    const { rerender } = render(<Wrapped visible />)
    const before = withTiming.mock.calls.length

    rerender(<Wrapped visible={false} />)
    expect(screen.queryByTestId('card')).not.toBeNull()

    settle(withTiming, before)
    expect(screen.queryByTestId('card')).toBeNull()
  })

  it('a usePresence() consumer with no Motion.* waits for safeToRemove', () => {
    let remove: () => void = () => {}
    function Custom() {
      const presence = usePresence()
      remove = () => presence?.safeToRemove()
      return <View testID="custom" />
    }
    const Host = ({ visible }: { visible: boolean }) => (
      <Presence>{visible ? <Custom key="custom" /> : null}</Presence>
    )
    const { rerender } = render(<Host visible />)

    rerender(<Host visible={false} />)
    expect(screen.queryByTestId('custom')).not.toBeNull()

    act(() => remove())
    expect(screen.queryByTestId('custom')).toBeNull()
  })

  it('a usePresence() reader does not block the Motion.* exits', () => {
    function Reader() {
      const presence = usePresence()
      return <Text>{presence?.isPresent ? 'in' : 'out'}</Text>
    }
    const Host = ({ visible }: { visible: boolean }) => (
      <Presence>
        {visible ? (
          <Motion.View
            key="sheet"
            testID="sheet"
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ type: 'timing', duration: 10_000 }}
          >
            <Reader />
          </Motion.View>
        ) : null}
      </Presence>
    )
    const { rerender } = render(<Host visible />)
    const before = withTiming.mock.calls.length

    rerender(<Host visible={false} />)
    expect(screen.queryByTestId('sheet')).not.toBeNull()

    settle(withTiming, before)
    expect(screen.queryByTestId('sheet')).toBeNull()
  })

  it('a child that returns and departs again still leaves at once', () => {
    function Toggle() {
      const [loading, setLoading] = useState(true)
      useEffect(() => {
        setLoading(false)
      }, [])
      return (
        <>
          <Screen loading={loading} />
          <Text onPress={() => setLoading((v) => !v)} testID="flip" />
        </>
      )
    }
    render(<Toggle />)
    expect(screen.queryByTestId('loading')).toBeNull()

    act(() => screen.getByTestId('flip').props.onPress())
    expect(screen.queryByTestId('loading')).not.toBeNull()
    expect(screen.queryByTestId('content')).toBeNull()

    act(() => screen.getByTestId('flip').props.onPress())
    expect(screen.queryByTestId('loading')).toBeNull()
    expect(screen.queryByTestId('content')).not.toBeNull()
  })
})
