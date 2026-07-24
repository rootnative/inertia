import { act, render, screen } from '@testing-library/react-native'
import * as Reanimated from 'react-native-reanimated'
import { Motion, Presence } from '../index'

// `AnimationCallbackInfo` is generic over the primitive's style shape, so its
// `key` is `keyof ViewStyle | 'transform'`. Tests only care about the four
// fields asserted below — projecting to this shape keeps the assertions
// readable without casting the whole payload.
interface Settled {
  key: string
  finished: boolean
  target: unknown
  phase: 'step' | 'sequence' | 'repeat' | 'animation'
}

const record =
  (into: Settled[]) =>
  ({ key, finished, target, phase }: Settled): number =>
    into.push({ key, finished, target, phase })

// Regression: anything that counts pending completions has to exclude
// `repeat: 'infinite'` animations.
//
// `dispatch` only promotes a callback to the terminal `'animation'` phase once
// `iteration >= totalIterations - 1`, and that comparison is unreachable
// against `Infinity`. Two counters were gated behind it:
//
//   1. The transform group. One endless axis pinned `remaining` above zero, so
//      a sibling axis with a finite transition settled, decremented, and had
//      its completion silently swallowed — no `onAnimationEnd` at all.
//   2. <Presence>'s settle counter. An endless `exit` animation (a top-level
//      `repeat: 'infinite'` transition is inherited by `exit`, e.g. a pulsing
//      element inside <Presence>) never called `safeToRemove`, so the child
//      stayed mounted forever.
//
// The static-render mock passes `withRepeat` straight through, but both bugs
// live in our own JS dispatch logic, which keys off `totalIterations` — so
// they reproduce here exactly as they do on device.

type SpringSpy = jest.SpyInstance<
  unknown,
  Parameters<typeof Reanimated.withSpring>
>

// Settling can call `safeToRemove`, which sets state on <Presence> — wrap so
// React flushes it before the assertion reads the tree.
function settleAll(spy: SpringSpy) {
  act(() => {
    for (const call of spy.mock.calls) {
      const cb = call[2] as ((finished?: boolean) => void) | undefined
      cb?.(true)
    }
  })
}

const xEndlessYFinite = {
  translateX: { type: 'spring', repeat: 'infinite' },
  translateY: { type: 'spring' },
} as const

const xFiniteYEndless = {
  translateX: { type: 'spring' },
  translateY: { type: 'spring', repeat: 'infinite' },
} as const

const bothEndless = { type: 'spring', repeat: 'infinite' } as const

const twoAxes = { translateX: 100, translateY: 50 }

describe('endless repeat — transform group', () => {
  function run(transition: unknown): Settled[] {
    const spy = jest.spyOn(Reanimated, 'withSpring') as SpringSpy
    const seen: Settled[] = []
    render(
      <Motion.View
        testID="box"
        animate={twoAxes}
        transition={transition as never}
        onAnimationEnd={record(seen)}
      />,
    )
    settleAll(spy)
    spy.mockRestore()
    return seen
  }

  it('still coalesces when every axis is finite', () => {
    const terminal = run(undefined).filter((i) => i.phase === 'animation')
    expect(terminal).toHaveLength(1)
    expect(terminal[0]).toMatchObject({ key: 'transform', finished: true })
  })

  it('reports the finite axis when a sibling axis repeats forever', () => {
    const terminal = run(xEndlessYFinite).filter((i) => i.phase === 'animation')
    expect(terminal).toHaveLength(1)
    expect(terminal[0]).toMatchObject({ key: 'transform', target: 50 })
  })

  it('does not depend on which axis is the endless one', () => {
    const terminal = run(xFiniteYEndless).filter((i) => i.phase === 'animation')
    expect(terminal).toHaveLength(1)
    expect(terminal[0]).toMatchObject({ key: 'transform', target: 100 })
  })

  it('fires no terminal event when every axis repeats forever', () => {
    const seen = run(bothEndless)
    expect(seen.filter((i) => i.phase === 'animation')).toHaveLength(0)
    // Per-iteration events still fire per-axis, as they always have.
    expect(seen.every((i) => i.phase === 'repeat')).toBe(true)
    expect(seen.map((i) => i.key).sort()).toEqual(['translateX', 'translateY'])
  })

  it('leaves a non-transform key reporting under its own name', () => {
    const spy = jest.spyOn(Reanimated, 'withSpring') as SpringSpy
    const seen: Settled[] = []
    render(
      <Motion.View
        testID="box"
        animate={{ translateX: 100, opacity: 0.5 }}
        transition={xEndlessYFinite as never}
        onAnimationEnd={record(seen)}
      />,
    )
    settleAll(spy)
    spy.mockRestore()
    const terminal = seen.filter((i) => i.phase === 'animation')
    expect(terminal).toHaveLength(1)
    expect(terminal[0]).toMatchObject({ key: 'opacity' })
  })
})

const exitOpacity = { opacity: 0 }
const exitTwoKeys = { opacity: 0, width: 0 }
const finiteSpring = { type: 'spring' } as const
const opacityEndlessWidthFinite = {
  opacity: { type: 'spring', repeat: 'infinite' },
  width: { type: 'spring' },
} as const

describe('endless repeat — <Presence> unmount is never gated on it', () => {
  function Harness({
    visible,
    transition,
    exit,
  }: {
    visible: boolean
    transition: unknown
    exit: Record<string, number>
  }) {
    return (
      <Presence>
        {visible ? (
          <Motion.View
            key="pulse"
            testID="pulse"
            animate={{ opacity: 1 }}
            exit={exit as never}
            transition={transition as never}
          />
        ) : null}
      </Presence>
    )
  }

  it('a finite exit still gates the unmount until it settles', () => {
    const spy = jest.spyOn(Reanimated, 'withSpring') as SpringSpy
    const { rerender } = render(
      <Harness visible transition={finiteSpring} exit={exitOpacity} />,
    )
    rerender(
      <Harness visible={false} transition={finiteSpring} exit={exitOpacity} />,
    )
    // Not settled yet — the child must still be on screen animating out.
    expect(screen.queryByTestId('pulse')).not.toBeNull()

    settleAll(spy)
    rerender(
      <Harness visible={false} transition={finiteSpring} exit={exitOpacity} />,
    )
    expect(screen.queryByTestId('pulse')).toBeNull()
    spy.mockRestore()
  })

  it('an endless exit releases immediately instead of pinning the child', () => {
    const spy = jest.spyOn(Reanimated, 'withSpring') as SpringSpy
    const { rerender } = render(
      <Harness visible transition={bothEndless} exit={exitOpacity} />,
    )
    rerender(
      <Harness visible={false} transition={bothEndless} exit={exitOpacity} />,
    )
    settleAll(spy)
    rerender(
      <Harness visible={false} transition={bothEndless} exit={exitOpacity} />,
    )
    expect(screen.queryByTestId('pulse')).toBeNull()
    spy.mockRestore()
  })

  it('waits on the finite exit key when only one of two is endless', () => {
    const spy = jest.spyOn(Reanimated, 'withSpring') as SpringSpy
    const ui = (visible: boolean) => (
      <Harness
        visible={visible}
        transition={opacityEndlessWidthFinite}
        exit={exitTwoKeys}
      />
    )
    const { rerender } = render(ui(true))
    rerender(ui(false))
    // `width` is finite and still in flight, so it gates the unmount.
    expect(screen.queryByTestId('pulse')).not.toBeNull()

    settleAll(spy)
    rerender(ui(false))
    expect(screen.queryByTestId('pulse')).toBeNull()
    spy.mockRestore()
  })
})
