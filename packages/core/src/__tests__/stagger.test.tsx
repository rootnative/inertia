import { render } from '@testing-library/react-native'
import { StyleSheet, View } from 'react-native'
import * as Reanimated from 'react-native-reanimated'
import { MotionConfig } from '../config'
import { Motion } from '../motion'
import { Presence } from '../presence'
import { Stagger } from '../stagger'
import { flushMotion } from '../testing'

// <Stagger> assigns each child slot a delay from its position; the Motion
// factory wraps each key's fully resolved animation in `withDelay` with that
// value. The Jest mock's `withDelay` is `(_d, v) => v`, so the delay itself
// is observable only through the spy — final values still resolve
// synchronously, which the last test pins.

beforeEach(() => {
  jest.restoreAllMocks()
})

/** Delays of every `withDelay` call since the spy was installed. */
const delaysOf = (spy: jest.SpyInstance) => spy.mock.calls.map((c) => c[0])

describe('<Stagger>', () => {
  it('assigns increasing delays from child position', () => {
    const withDelay = jest.spyOn(Reanimated, 'withDelay')
    render(
      <Stagger interval={100}>
        <Motion.View initial={{ opacity: 0 }} animate={{ opacity: 1 }} />
        <Motion.View initial={{ opacity: 0 }} animate={{ opacity: 1 }} />
        <Motion.View initial={{ opacity: 0 }} animate={{ opacity: 1 }} />
      </Stagger>,
    )
    // Child 0's delay is 0, which `applyDelay` treats as a pass-through — so
    // only children 1 and 2 reach `withDelay`.
    expect(delaysOf(withDelay)).toEqual([100, 200])
  })

  it('adds the base delay to every child', () => {
    const withDelay = jest.spyOn(Reanimated, 'withDelay')
    render(
      <Stagger interval={100} delay={50}>
        <Motion.View initial={{ opacity: 0 }} animate={{ opacity: 1 }} />
        <Motion.View initial={{ opacity: 0 }} animate={{ opacity: 1 }} />
      </Stagger>,
    )
    expect(delaysOf(withDelay)).toEqual([50, 150])
  })

  it("from='last' reverses the cascade", () => {
    const withDelay = jest.spyOn(Reanimated, 'withDelay')
    render(
      <Stagger interval={100} from="last">
        <Motion.View initial={{ opacity: 0 }} animate={{ opacity: 1 }} />
        <Motion.View initial={{ opacity: 0 }} animate={{ opacity: 1 }} />
        <Motion.View initial={{ opacity: 0 }} animate={{ opacity: 1 }} />
      </Stagger>,
    )
    // Render order: child 0 → 200, child 1 → 100, child 2 → 0 (pass-through).
    expect(delaysOf(withDelay)).toEqual([200, 100])
  })

  it('enabled={false} removes every delay', () => {
    const withDelay = jest.spyOn(Reanimated, 'withDelay')
    render(
      <Stagger interval={100} enabled={false}>
        <Motion.View initial={{ opacity: 0 }} animate={{ opacity: 1 }} />
        <Motion.View initial={{ opacity: 0 }} animate={{ opacity: 1 }} />
      </Stagger>,
    )
    expect(withDelay).not.toHaveBeenCalled()
  })

  it('skips null and boolean children when assigning positions', () => {
    const withDelay = jest.spyOn(Reanimated, 'withDelay')
    render(
      <Stagger interval={100}>
        {null}
        <Motion.View initial={{ opacity: 0 }} animate={{ opacity: 1 }} />
        {false}
        <Motion.View initial={{ opacity: 0 }} animate={{ opacity: 1 }} />
      </Stagger>,
    )
    // The two Motion children sit at positions 0 and 1, not 1 and 3.
    expect(delaysOf(withDelay)).toEqual([100])
  })

  it('reaches Motion primitives nested inside a child subtree', () => {
    const withDelay = jest.spyOn(Reanimated, 'withDelay')
    render(
      <Stagger interval={100}>
        <View>
          <Motion.View initial={{ opacity: 0 }} animate={{ opacity: 1 }} />
        </View>
        <View>
          <Motion.View initial={{ opacity: 0 }} animate={{ opacity: 1 }} />
        </View>
      </Stagger>,
    )
    expect(delaysOf(withDelay)).toEqual([100])
  })

  it("composes with the consumer's own transition delay", () => {
    const withDelay = jest.spyOn(Reanimated, 'withDelay')
    render(
      <Stagger interval={100}>
        <Motion.View initial={{ opacity: 0 }} animate={{ opacity: 1 }} />
        <Motion.View
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ type: 'timing', delay: 30 }}
        />
      </Stagger>,
    )
    // Child 1 gets two nested wraps: its own 30 ms inside `resolveTransition`,
    // the stagger's 100 ms outside — the delays add rather than replace.
    expect(delaysOf(withDelay)).toEqual([30, 100])
  })

  it('delays a keyframe sequence once, not per step', () => {
    const withDelay = jest.spyOn(Reanimated, 'withDelay')
    render(
      <Stagger interval={100}>
        <Motion.View animate={{ opacity: 1 }} />
        <Motion.View animate={{ opacity: [0, 0.5, 1] }} />
      </Stagger>,
    )
    // One wrap around the whole `withSequence`, not one per step.
    expect(delaysOf(withDelay)).toEqual([100])
  })

  it('a later animate change staggers again', () => {
    const withDelay = jest.spyOn(Reanimated, 'withDelay')
    const ui = (open: boolean) => (
      <Stagger interval={100}>
        <Motion.View animate={{ opacity: open ? 1 : 0 }} />
        <Motion.View animate={{ opacity: open ? 1 : 0 }} />
      </Stagger>
    )
    const { rerender } = render(ui(false))
    const afterMount = withDelay.mock.calls.length
    rerender(ui(true))
    expect(delaysOf(withDelay).slice(afterMount)).toEqual([100])
  })

  it('reduced motion snaps with no delay at all', () => {
    const withDelay = jest.spyOn(Reanimated, 'withDelay')
    render(
      <MotionConfig reducedMotion="always">
        <Stagger interval={100}>
          <Motion.View initial={{ opacity: 0 }} animate={{ opacity: 1 }} />
          <Motion.View initial={{ opacity: 0 }} animate={{ opacity: 1 }} />
        </Stagger>
      </MotionConfig>,
    )
    expect(withDelay).not.toHaveBeenCalled()
  })

  it('does not delay a <Presence> exit', () => {
    const withDelay = jest.spyOn(Reanimated, 'withDelay')
    const ui = (both: boolean) => (
      <Stagger interval={100}>
        <Presence>
          <Motion.View key="a" animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
          {both ? (
            <Motion.View
              key="b"
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />
          ) : null}
        </Presence>
      </Stagger>
    )
    const { rerender } = render(ui(true))
    const afterMount = withDelay.mock.calls.length
    rerender(ui(false))
    // The exiting child resolves its exit animation without a stagger wrap.
    expect(withDelay.mock.calls.length).toBe(afterMount)
  })

  it('final values still resolve to their targets', () => {
    // Built per call: the flush must hand React fresh child element
    // identities, or the Motion children bail out of the second render and
    // `useAnimatedStyle` never re-reads the settled shared values.
    const ui = () => (
      <Stagger interval={100}>
        <Motion.View
          testID="first"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        />
        <Motion.View
          testID="second"
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.5 }}
        />
      </Stagger>
    )
    const result = render(ui())
    flushMotion(result, ui())
    const { getByTestId } = result
    // The mock resolves animations synchronously and `withDelay` is the
    // identity there, so both children land on their targets.
    const flat = (testID: string) =>
      StyleSheet.flatten(getByTestId(testID).props.style as never) as {
        opacity?: number
      }
    expect(flat('first').opacity).toBe(1)
    expect(flat('second').opacity).toBe(0.5)
  })
})
