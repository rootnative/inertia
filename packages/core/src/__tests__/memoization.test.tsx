import { render } from '@testing-library/react-native'
import * as Reanimated from 'react-native-reanimated'
import { Motion } from '../motion'

// Phase-1 acceptance: re-renders with structurally-unchanged `animate` and
// `transition` must produce zero new UI-thread closures. The factory hashes
// both props with `stableStringify` and gates the animation effect on those
// signatures — so a parent re-render with `animate={{ opacity: 1 }}` (a fresh
// object literal but identical shape) should NOT re-invoke `withSpring`.
//
// We assert this via the spy on the Reanimated mock: each `withSpring` call
// is one new closure. If memoization breaks, the count climbs with every
// re-render.

beforeEach(() => {
  jest.restoreAllMocks()
})

describe('memoization — Phase-1 acceptance', () => {
  it('structurally-identical animate prop does not re-invoke withSpring', () => {
    const withSpring = jest.spyOn(Reanimated, 'withSpring')

    const { rerender } = render(
      <Motion.View
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ type: 'spring' }}
      />,
    )
    const callsAfterMount = withSpring.mock.calls.length
    expect(callsAfterMount).toBeGreaterThan(0)

    // Re-render three times with a fresh-but-equal object on every render.
    // React compares the prop reference (different each time), but Inertia's
    // signature hash is unchanged → the effect's dep array is equal →
    // useEffect doesn't fire → no new Reanimated closures.
    for (let i = 0; i < 3; i++) {
      rerender(
        <Motion.View
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ type: 'spring' }}
        />,
      )
    }
    expect(withSpring.mock.calls.length).toBe(callsAfterMount)
  })

  it('changing an animate value re-invokes withSpring', () => {
    const withSpring = jest.spyOn(Reanimated, 'withSpring')

    const { rerender } = render(
      <Motion.View animate={{ opacity: 1 }} transition={{ type: 'spring' }} />,
    )
    const callsAfterMount = withSpring.mock.calls.length

    rerender(
      <Motion.View
        animate={{ opacity: 0.5 }}
        transition={{ type: 'spring' }}
      />,
    )
    expect(withSpring.mock.calls.length).toBeGreaterThan(callsAfterMount)
  })

  it('changing the transition config re-invokes withSpring', () => {
    const withSpring = jest.spyOn(Reanimated, 'withSpring')

    const { rerender } = render(
      <Motion.View
        animate={{ opacity: 1 }}
        transition={{ type: 'spring', tension: 170 }}
      />,
    )
    const callsAfterMount = withSpring.mock.calls.length

    rerender(
      <Motion.View
        animate={{ opacity: 1 }}
        transition={{ type: 'spring', tension: 240 }}
      />,
    )
    expect(withSpring.mock.calls.length).toBeGreaterThan(callsAfterMount)
  })

  it('property-order swap does not re-invoke (stable signature ignores key order)', () => {
    const withSpring = jest.spyOn(Reanimated, 'withSpring')

    const { rerender } = render(
      <Motion.View
        animate={{ opacity: 1, scale: 1.2 }}
        transition={{ type: 'spring' }}
      />,
    )
    const callsAfterMount = withSpring.mock.calls.length
    expect(callsAfterMount).toBe(2) // one per active key

    rerender(
      <Motion.View
        // Same fields, declared in the opposite order.
        animate={{ scale: 1.2, opacity: 1 }}
        transition={{ type: 'spring' }}
      />,
    )
    expect(withSpring.mock.calls.length).toBe(callsAfterMount)
  })
})
