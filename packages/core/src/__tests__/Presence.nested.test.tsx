import { act, render, screen } from '@testing-library/react-native'
import { type ReactNode, useEffect, useState } from 'react'
import * as Reanimated from 'react-native-reanimated'
import { Motion, Presence, usePresence } from '../index'

// An exiting child is removed only when every `Motion.*` under it has finished
// its exit. Before this, the first `safeToRemove` call removed the child, so a
// nested `Motion.*` with no `exit` (a progress bar, a skeleton) removed a
// dialog on the first frame of its exit, and a nested `Motion.*` with a
// shorter `exit` cut the exit of its ancestor.
//
// The mock never fires a settle callback by itself. The parent exits on
// `withTiming` and a nested exit runs on `withSpring`, so each test settles
// the two sides by hand and in the order it needs.

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

function Sheet({
  visible,
  children,
}: {
  visible: boolean
  children?: ReactNode
}) {
  return (
    <Presence>
      {visible ? (
        <Motion.View
          key="sheet"
          testID="sheet"
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ type: 'timing', duration: 10_000 }}
        >
          {children}
        </Motion.View>
      ) : null}
    </Presence>
  )
}

const NESTED_SHORTER_EXIT = (
  <Motion.View
    testID="nested"
    animate={{ scale: 1 }}
    exit={{ scale: 0.5 }}
    transition={{ type: 'spring' }}
  />
)

let withTiming: WithSpy
let withSpring: WithSpy

beforeEach(() => {
  jest.restoreAllMocks()
  withTiming = jest.spyOn(Reanimated, 'withTiming') as WithSpy
  withSpring = jest.spyOn(Reanimated, 'withSpring') as WithSpy
})

describe('<Presence> — nested Motion.* children', () => {
  it.each([
    ['a prop-less Motion.View', <Motion.View key="n" />],
    [
      'a Motion.View with animate and no exit',
      <Motion.View key="n" animate={{ opacity: 0.5 }} />,
    ],
    [
      'an endless Motion.View with no exit',
      <Motion.View
        key="n"
        animate={{ rotate: 360 }}
        transition={{ type: 'timing', duration: 1000, repeat: 'infinite' }}
      />,
    ],
  ])('%s does not remove the exiting child', (_, nested) => {
    const { rerender } = render(<Sheet visible>{nested}</Sheet>)
    const before = withTiming.mock.calls.length

    rerender(<Sheet visible={false}>{nested}</Sheet>)
    expect(screen.queryByTestId('sheet')).not.toBeNull()

    settle(withTiming, before)
    expect(screen.queryByTestId('sheet')).toBeNull()
  })

  it('a shorter nested exit does not cut the exit of its ancestor', () => {
    const { rerender } = render(<Sheet visible>{NESTED_SHORTER_EXIT}</Sheet>)
    const timingBefore = withTiming.mock.calls.length
    const springBefore = withSpring.mock.calls.length

    rerender(<Sheet visible={false}>{NESTED_SHORTER_EXIT}</Sheet>)
    settle(withSpring, springBefore)
    expect(screen.queryByTestId('sheet')).not.toBeNull()

    settle(withTiming, timingBefore)
    expect(screen.queryByTestId('sheet')).toBeNull()
  })

  it('a longer nested exit holds the child until it settles', () => {
    const { rerender } = render(<Sheet visible>{NESTED_SHORTER_EXIT}</Sheet>)
    const timingBefore = withTiming.mock.calls.length
    const springBefore = withSpring.mock.calls.length

    rerender(<Sheet visible={false}>{NESTED_SHORTER_EXIT}</Sheet>)
    settle(withTiming, timingBefore)
    expect(screen.queryByTestId('nested')).not.toBeNull()

    settle(withSpring, springBefore)
    expect(screen.queryByTestId('sheet')).toBeNull()
  })

  it('a child that returns mid-exit waits for every exit again', () => {
    const { rerender } = render(<Sheet visible>{NESTED_SHORTER_EXIT}</Sheet>)
    let springBefore = withSpring.mock.calls.length

    rerender(<Sheet visible={false}>{NESTED_SHORTER_EXIT}</Sheet>)
    settle(withSpring, springBefore)
    rerender(<Sheet visible>{NESTED_SHORTER_EXIT}</Sheet>)

    const timingBefore = withTiming.mock.calls.length
    springBefore = withSpring.mock.calls.length
    rerender(<Sheet visible={false}>{NESTED_SHORTER_EXIT}</Sheet>)
    settle(withTiming, timingBefore)
    expect(screen.queryByTestId('sheet')).not.toBeNull()

    settle(withSpring, springBefore)
    expect(screen.queryByTestId('sheet')).toBeNull()
  })

  it('removes the child when the last pending Motion.* unmounts mid-exit', () => {
    // An exiting child is a frozen element, so only its own state can change
    // what it renders.
    let hideNested: () => void = () => {}
    function Body() {
      const [showNested, setShowNested] = useState(true)
      hideNested = () => setShowNested(false)
      return showNested ? NESTED_SHORTER_EXIT : null
    }
    const { rerender } = render(
      <Sheet visible>
        <Body />
      </Sheet>,
    )
    const timingBefore = withTiming.mock.calls.length

    rerender(
      <Sheet visible={false}>
        <Body />
      </Sheet>,
    )
    settle(withTiming, timingBefore)
    expect(screen.queryByTestId('sheet')).not.toBeNull()

    act(() => hideNested())
    expect(screen.queryByTestId('sheet')).toBeNull()
  })

  it('a custom usePresence() consumer still removes the child at once', () => {
    function ReleaseOnExit() {
      const presence = usePresence()
      const [released, setReleased] = useState(false)
      useEffect(() => {
        if (presence && !presence.isPresent && !released) {
          setReleased(true)
          presence.safeToRemove()
        }
      }, [presence, released])
      return null
    }

    const { rerender } = render(
      <Sheet visible>
        <ReleaseOnExit />
      </Sheet>,
    )
    rerender(
      <Sheet visible={false}>
        <ReleaseOnExit />
      </Sheet>,
    )
    expect(screen.queryByTestId('sheet')).toBeNull()
  })
})
