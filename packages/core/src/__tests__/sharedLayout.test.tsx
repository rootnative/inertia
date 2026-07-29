import { act, render, renderHook } from '@testing-library/react-native'
import { type ReactElement } from 'react'
import * as Reanimated from 'react-native-reanimated'
import { Motion } from '../motion'
import { flushMotion } from '../testing'
import {
  __setSharedLayoutClock,
  __setSharedLayoutMeasurer,
  __sharedRegistrySize,
  clearSharedRegistry,
  consumeLayout,
  type MeasuredRect,
  measureWindowRect,
  peekSharedLayout,
  registerLayout,
  releaseLayout,
  SHARED_LAYOUT_TTL_MS,
  type SharedRect,
  type SharedStyleSnapshot,
  useSharedLayout,
} from '../layout'

const boxStyle = { width: 50, height: 50 }

/** Parent-relative rect, the shape `onLayout` reports. */
function par(x: number, y: number, width: number, height: number): SharedRect {
  return { x, y, width, height, space: 'parent' }
}

/** Window rect, the shape `measureInWindow` reports. */
function win(x: number, y: number, width: number, height: number): SharedRect {
  return { x, y, width, height, space: 'window' }
}

/**
 * Fire the rendered Motion primitive's `onLayout` with a synthetic
 * nativeEvent.
 *
 * With no measurer stubbed, the Jest host nodes have no `measureInWindow`, so
 * the hook records the parent-relative coords from this event and everything
 * stays in `'parent'` space — which is what most of the cases below want.
 */
function fireLayout(
  node: { props: Record<string, unknown> },
  rect: { x: number; y: number; width: number; height: number },
) {
  const onLayout = node.props.onLayout as ((event: unknown) => void) | undefined
  act(() => {
    onLayout?.({ nativeEvent: { layout: { ...rect } } })
  })
}

/**
 * Stub window measurement with a queue consumed in call order, and return the
 * list of nodes it was asked about.
 *
 * Order is deterministic: an element measures itself during its own `onLayout`,
 * and only then asks a still-mounted source to re-measure.
 */
function stubMeasurements(...queue: Array<MeasuredRect | undefined>) {
  let i = 0
  const seen: unknown[] = []
  __setSharedLayoutMeasurer((node) => {
    seen.push(node)
    return queue[i++]
  })
  return seen
}

/** First leg of each FLIP `withSequence` is `withTiming(delta, duration: 0)`. */
function flipSnapValues(withTiming: jest.SpyInstance): number[] {
  return withTiming.mock.calls
    .filter((call) => (call[1] as { duration?: number })?.duration === 0)
    .map((call) => call[0] as number)
}

/**
 * Freeze every `withSequence` at its **first** leg — the instantaneous snap to
 * the source value.
 *
 * The static mock otherwise collapses a sequence to its final leg, which is the
 * resting state: correct, but it shows nothing about the transition. Holding the
 * snap frame is how a style crossfade becomes observable at all, since progress
 * sits at 1 and every carried key renders at the source's value.
 */
function freezeAtSnapFrame(): void {
  jest
    .spyOn(Reanimated, 'withSequence')
    .mockImplementation((...args: unknown[]) => args[0] as never)
}

/** Flattened style of a rendered node, style-array and all. */
function getStyle(node: {
  props: { style?: unknown }
}): Record<string, unknown> {
  const raw = node.props.style
  const flat = Array.isArray(raw) ? raw.flat(Infinity) : [raw]
  return Object.assign({}, ...flat.filter(Boolean))
}

/**
 * Mount a target, hand it a layout, then re-render so `useAnimatedStyle`
 * re-reads the shared values the layout pass just wrote. Returns the target's
 * style at that moment.
 */
function styleAfterLayout(
  ui: ReactElement,
  rect: { x: number; y: number; width: number; height: number },
): Record<string, unknown> {
  const view = render(ui)
  fireLayout(view.getByTestId('el') as never, rect)
  flushMotion(view, ui)
  return getStyle(view.getByTestId('el') as never)
}

beforeEach(() => {
  clearSharedRegistry()
  __setSharedLayoutClock(undefined)
  __setSharedLayoutMeasurer(undefined)
  jest.restoreAllMocks()
})

afterEach(() => {
  __setSharedLayoutMeasurer(undefined)
})

describe('sharedRegistry', () => {
  it('register/peek/consume — happy path', () => {
    registerLayout('hero', par(10, 20, 100, 200))
    expect(peekSharedLayout('hero')).toEqual(par(10, 20, 100, 200))
    expect(consumeLayout('hero')?.rect).toEqual(par(10, 20, 100, 200))
    // Consumed entry is removed — second consume returns undefined.
    expect(consumeLayout('hero')).toBeUndefined()
  })

  it('expired entries are dropped on consume', () => {
    let now = 1000
    __setSharedLayoutClock(() => now)
    registerLayout('hero', par(0, 0, 10, 10))
    now += SHARED_LAYOUT_TTL_MS + 1
    expect(consumeLayout('hero')).toBeUndefined()
    // peek also treats expired as missing
    registerLayout('hero', par(1, 1, 1, 1))
    now += SHARED_LAYOUT_TTL_MS + 1
    expect(peekSharedLayout('hero')).toBeUndefined()
  })

  it('releaseLayout overwrites the entry with a fresh TTL', () => {
    let now = 1000
    __setSharedLayoutClock(() => now)
    registerLayout('hero', par(0, 0, 0, 0))
    now += SHARED_LAYOUT_TTL_MS - 1
    releaseLayout('hero', par(5, 5, 5, 5))
    now += SHARED_LAYOUT_TTL_MS - 1 // still within the fresh TTL
    expect(peekSharedLayout('hero')).toEqual(par(5, 5, 5, 5))
  })

  it('different ids are isolated', () => {
    registerLayout('a', par(1, 1, 1, 1))
    registerLayout('b', par(2, 2, 2, 2))
    expect(consumeLayout('a')?.rect).toEqual(par(1, 1, 1, 1))
    expect(consumeLayout('b')?.rect).toEqual(par(2, 2, 2, 2))
  })

  it('carries a mounted owner’s remeasure hook through consume', () => {
    const remeasure = jest.fn()
    registerLayout('hero', win(0, 0, 10, 10), remeasure)
    expect(consumeLayout('hero')?.remeasure).toBe(remeasure)
  })

  it('releaseLayout drops the remeasure hook', () => {
    // The node is on its way out; measuring a detached view yields zeros, so
    // the stored rect is all a later consumer should get.
    registerLayout('hero', win(0, 0, 10, 10), jest.fn())
    releaseLayout('hero', win(0, 0, 10, 10))
    expect(consumeLayout('hero')?.remeasure).toBeUndefined()
  })
})

describe('Motion.* — layoutId integration', () => {
  it('no-op when no source rect is in the registry', () => {
    const withSpring = jest.spyOn(Reanimated, 'withSpring')
    const view = render(
      <Motion.View testID="el" layoutId="hero" style={boxStyle} />,
    )
    fireLayout(view.getByTestId('el') as never, {
      x: 100,
      y: 100,
      width: 50,
      height: 50,
    })
    // No source — no FLIP withSpring calls.
    expect(withSpring).not.toHaveBeenCalled()
    // Registry holds the latest rect so a future remount can FLIP from it.
    expect(peekSharedLayout('hero')).toEqual(par(100, 100, 50, 50))
  })

  it('consumes a source rect on first layout and kicks off FLIP', () => {
    const withSpring = jest.spyOn(Reanimated, 'withSpring')
    const withSequence = jest.spyOn(Reanimated, 'withSequence')
    registerLayout('hero', par(0, 0, 50, 50))

    const view = render(
      <Motion.View testID="el" layoutId="hero" style={boxStyle} />,
    )
    fireLayout(view.getByTestId('el') as never, {
      x: 100,
      y: 100,
      width: 100,
      height: 100,
    })

    // Four withSequence(snap, withSpring(toIdentity)) pairs — dx, dy, sx, sy.
    expect(withSequence).toHaveBeenCalledTimes(4)
    expect(withSpring).toHaveBeenCalledTimes(4)
  })

  it('reduced motion skips the FLIP animation', () => {
    jest.spyOn(Reanimated, 'useReducedMotion').mockReturnValue(true)
    const withSpring = jest.spyOn(Reanimated, 'withSpring')
    const withSequence = jest.spyOn(Reanimated, 'withSequence')
    registerLayout('hero', par(0, 0, 50, 50))

    const view = render(
      <Motion.View testID="el" layoutId="hero" style={boxStyle} />,
    )
    fireLayout(view.getByTestId('el') as never, {
      x: 100,
      y: 100,
      width: 100,
      height: 100,
    })

    expect(withSpring).not.toHaveBeenCalled()
    expect(withSequence).not.toHaveBeenCalled()
  })

  it('only the first layout consumes a source rect', () => {
    const withSpring = jest.spyOn(Reanimated, 'withSpring')
    registerLayout('hero', par(0, 0, 50, 50))

    const view = render(
      <Motion.View testID="el" layoutId="hero" style={boxStyle} />,
    )
    const node = view.getByTestId('el')
    fireLayout(node as never, { x: 100, y: 100, width: 100, height: 100 })
    expect(withSpring).toHaveBeenCalledTimes(4)

    // A second layout (resize, prop change) shouldn't re-trigger FLIP.
    // Re-seed to prove the consume guard, not a missing source, is the gate.
    registerLayout('hero', par(200, 200, 50, 50))
    fireLayout(node as never, { x: 100, y: 100, width: 110, height: 110 })
    expect(withSpring).toHaveBeenCalledTimes(4)
  })

  it('unmount releases the latest measured rect under the same id', () => {
    const view = render(
      <Motion.View testID="el" layoutId="hero" style={boxStyle} />,
    )
    fireLayout(view.getByTestId('el') as never, {
      x: 100,
      y: 100,
      width: 50,
      height: 50,
    })
    expect(peekSharedLayout('hero')).toEqual(par(100, 100, 50, 50))

    view.unmount()
    expect(peekSharedLayout('hero')).toEqual(par(100, 100, 50, 50))
  })

  it('forwards user-supplied onLayout and ref alongside the internal ones', () => {
    const userOnLayout = jest.fn()
    const userRef = jest.fn()
    const view = render(
      <Motion.View
        testID="el"
        layoutId="hero"
        ref={userRef as never}
        onLayout={userOnLayout}
        style={boxStyle}
      />,
    )
    expect(userRef).toHaveBeenCalled()

    fireLayout(view.getByTestId('el') as never, {
      x: 1,
      y: 2,
      width: 3,
      height: 4,
    })
    expect(userOnLayout).toHaveBeenCalledTimes(1)
  })
})

describe('Motion.* — layoutId omitted', () => {
  it('does not touch the registry when layoutId is omitted', () => {
    const view = render(<Motion.View testID="el" style={boxStyle} />)
    fireLayout(view.getByTestId('el') as never, {
      x: 100,
      y: 100,
      width: 50,
      height: 50,
    })
    expect(peekSharedLayout('hero')).toBeUndefined()
  })
})

// The reason item B exists. Parent-relative rects only compose when the source
// and target share an outer container; when their containers sit at different
// window offsets, every delta is short by exactly that offset. These cases pin
// the window-coordinate path that fixes it.
describe('layoutId — window coordinates', () => {
  it('computes the FLIP from window coords across differently-offset parents', () => {
    const withTiming = jest.spyOn(Reanimated, 'withTiming')
    // Source lived in a container 100px down the screen: parent-relative
    // (10, 10) is window (10, 110).
    registerLayout('hero', win(10, 110, 50, 50))
    // Target's container sits 400px down: parent-relative (10, 10) is window
    // (10, 410).
    stubMeasurements({ x: 10, y: 410, width: 100, height: 100 })

    const view = render(
      <Motion.View testID="el" layoutId="hero" style={boxStyle} />,
    )
    fireLayout(view.getByTestId('el') as never, {
      x: 10,
      y: 10,
      width: 100,
      height: 100,
    })

    // Centres: source (35, 135), target (60, 460) → delta (-25, -325).
    // Against the parent-relative implementation this was (-25, -25): the
    // 300px difference between the two containers was invisible.
    const snaps = flipSnapValues(withTiming)
    expect(snaps[0]).toBe(-25)
    expect(snaps[1]).toBe(-325)
  })

  it('records window coords in the registry when measurement succeeds', () => {
    stubMeasurements({ x: 10, y: 410, width: 100, height: 100 })

    const view = render(
      <Motion.View testID="el" layoutId="hero" style={boxStyle} />,
    )
    fireLayout(view.getByTestId('el') as never, {
      x: 10,
      y: 10,
      width: 100,
      height: 100,
    })

    expect(peekSharedLayout('hero')).toEqual(win(10, 410, 100, 100))
  })

  it('falls back to parent coords when the node cannot be measured', () => {
    // No `measureInWindow` on the host (the default in Jest, and the real
    // situation for any host that does not implement it).
    const view = render(
      <Motion.View testID="el" layoutId="hero" style={boxStyle} />,
    )
    fireLayout(view.getByTestId('el') as never, {
      x: 10,
      y: 10,
      width: 100,
      height: 100,
    })

    expect(peekSharedLayout('hero')).toEqual(par(10, 10, 100, 100))
  })

  it('treats a zero-sized measurement as unusable', () => {
    // Detached / not-yet-laid-out nodes report zeros rather than failing.
    // Trusting that would fling the element in from the top-left corner.
    stubMeasurements({ x: 0, y: 0, width: 0, height: 0 })

    const view = render(
      <Motion.View testID="el" layoutId="hero" style={boxStyle} />,
    )
    fireLayout(view.getByTestId('el') as never, {
      x: 10,
      y: 10,
      width: 100,
      height: 100,
    })

    expect(peekSharedLayout('hero')).toEqual(par(10, 10, 100, 100))
  })

  it('skips the FLIP when source and target are in different spaces', () => {
    const withSpring = jest.spyOn(Reanimated, 'withSpring')
    const withSequence = jest.spyOn(Reanimated, 'withSequence')
    // Source only ever got a parent-relative rect; target measures in window
    // space. The two are not comparable — the delta would be off by the
    // parent's window offset, so no animation is better than a wrong one.
    registerLayout('hero', par(10, 10, 50, 50))
    stubMeasurements({ x: 10, y: 410, width: 100, height: 100 })

    const view = render(
      <Motion.View testID="el" layoutId="hero" style={boxStyle} />,
    )
    fireLayout(view.getByTestId('el') as never, {
      x: 10,
      y: 10,
      width: 100,
      height: 100,
    })

    expect(withSpring).not.toHaveBeenCalled()
    expect(withSequence).not.toHaveBeenCalled()
  })
})

// Window coordinates are more fragile than parent-relative ones in one
// specific way: `onLayout` does not fire when an ANCESTOR scrolls, so a stored
// window rect goes stale as the user scrolls a list — where a parent-relative
// rect would have stayed valid. The mitigation is to re-measure the source at
// consume time whenever it is still mounted, which in a stack navigator it is.
describe('layoutId — source re-measure at consume time', () => {
  it('prefers a fresh source measurement over the stored rect', () => {
    const withTiming = jest.spyOn(Reanimated, 'withTiming')
    // Stored rect is from before the user scrolled 200px up.
    const remeasure = jest.fn(() => win(10, 110, 50, 50))
    registerLayout('hero', win(10, 310, 50, 50), remeasure)
    stubMeasurements({ x: 10, y: 410, width: 100, height: 100 })

    const view = render(
      <Motion.View testID="el" layoutId="hero" style={boxStyle} />,
    )
    fireLayout(view.getByTestId('el') as never, {
      x: 10,
      y: 10,
      width: 100,
      height: 100,
    })

    expect(remeasure).toHaveBeenCalledTimes(1)
    // Fresh source centre (35, 135) vs target (60, 460) → dy -325. The stale
    // stored rect would have given -125.
    expect(flipSnapValues(withTiming)[1]).toBe(-325)
  })

  it('falls back to the stored rect when the re-measure yields nothing', () => {
    const withTiming = jest.spyOn(Reanimated, 'withTiming')
    // Source unmounted between consume and the re-measure — a detached node
    // measures to nothing.
    const remeasure = () => undefined
    registerLayout('hero', win(10, 310, 50, 50), remeasure)
    stubMeasurements({ x: 10, y: 410, width: 100, height: 100 })

    const view = render(
      <Motion.View testID="el" layoutId="hero" style={boxStyle} />,
    )
    fireLayout(view.getByTestId('el') as never, {
      x: 10,
      y: 10,
      width: 100,
      height: 100,
    })

    // Stored source centre (35, 335) vs target (60, 460) → dy -125.
    expect(flipSnapValues(withTiming)[1]).toBe(-125)
  })

  it('a mounted element offers itself for re-measure', () => {
    // End-to-end: the element publishes a remeasure hook alongside its rect,
    // so a later mount can ask it for a current position.
    stubMeasurements({ x: 10, y: 410, width: 100, height: 100 })

    const view = render(
      <Motion.View testID="el" layoutId="hero" style={boxStyle} />,
    )
    fireLayout(view.getByTestId('el') as never, {
      x: 10,
      y: 10,
      width: 100,
      height: 100,
    })

    expect(typeof consumeLayout('hero')?.remeasure).toBe('function')
  })

  it('cancels its driven values on unmount', () => {
    // Tested on the hook rather than through a primitive: the factory cancels
    // ~two dozen of its own values too, which would bury the handful this hook
    // owns. They were missed by the `0.0.2` unmount-cancel pass.
    //
    // Five: the four FLIP transforms plus the style-carry progress. The carried
    // snapshot itself is assigned, never animated, so there is nothing on it
    // to cancel.
    const spy = jest.spyOn(Reanimated, 'cancelAnimation')
    const { unmount } = renderHook(() =>
      useSharedLayout({
        layoutId: 'hero',
        userRef: undefined,
        transition: undefined,
        shouldReduceMotion: false,
        userOnLayout: undefined,
      }),
    )

    spy.mockClear()
    unmount()
    expect(spy).toHaveBeenCalledTimes(5)
  })
})

// The rect FLIP moves and scales an element, but a hero card that changes
// colour, corner radius, or opacity between screens used to snap on those
// props while its frame animated — the most visible half of the transition
// arriving instantly. The carry crossfades the source's values for those keys
// over the same transition as the rect.
describe('layoutId — style carry', () => {
  const SOURCE: SharedStyleSnapshot = {
    backgroundColor: 'red',
    borderRadius: 4,
    opacity: 0.5,
  }
  const targetStyle = {
    ...boxStyle,
    backgroundColor: 'blue',
    borderRadius: 12,
    opacity: 1,
  }
  const LAYOUT = { x: 0, y: 0, width: 50, height: 50 }
  const redBox = { ...boxStyle, backgroundColor: 'red' }
  const textStyle = { fontSize: 16 }

  const target = (style: object = targetStyle) => (
    <Motion.View testID="el" layoutId="hero" style={style} />
  )

  it('round-trips a snapshot through the registry alongside the rect', () => {
    releaseLayout('hero', par(0, 0, 50, 50), SOURCE)
    const source = consumeLayout('hero')
    expect(source?.rect).toEqual(par(0, 0, 50, 50))
    expect(source?.styles).toEqual(SOURCE)
  })

  it('drops the snapshot with the rect when the TTL passes', () => {
    let now = 1_000
    __setSharedLayoutClock(() => now)
    releaseLayout('hero', par(0, 0, 50, 50), SOURCE)
    now += SHARED_LAYOUT_TTL_MS + 1
    expect(consumeLayout('hero')).toBeUndefined()
  })

  it('crossfades colour, borderRadius and opacity from the source', () => {
    freezeAtSnapFrame()
    releaseLayout('hero', par(0, 0, 50, 50), SOURCE)

    const style = styleAfterLayout(target(), LAYOUT)
    expect(style.backgroundColor).toBe('red')
    expect(style.borderRadius).toBe(4)
    expect(style.opacity).toBe(0.5)
  })

  it('settles on the target’s own values', () => {
    // No snap-frame freeze: the sequence resolves to its final leg, which is
    // where the element ends up once the transition has played out.
    releaseLayout('hero', par(0, 0, 50, 50), SOURCE)

    const style = styleAfterLayout(target(), LAYOUT)
    expect(style.backgroundColor).toBe('blue')
    expect(style.borderRadius).toBe(12)
    expect(style.opacity).toBe(1)
  })

  it('drives the crossfade on the same transition as the rect', () => {
    const withSequence = jest.spyOn(Reanimated, 'withSequence')
    releaseLayout('hero', par(0, 0, 50, 50), SOURCE)

    const view = render(target())
    fireLayout(view.getByTestId('el') as never, LAYOUT)

    // The four transform legs, plus one for the whole style carry — a single
    // progress value however many keys are being carried.
    expect(withSequence).toHaveBeenCalledTimes(5)
  })

  it('ignores a carried key the target has no value for', () => {
    freezeAtSnapFrame()
    releaseLayout('hero', par(0, 0, 50, 50), { borderRadius: 4 })

    // The target never mentions `borderRadius`, so it isn't in its active set
    // and the worklet has nothing to blend onto.
    const style = styleAfterLayout(target(boxStyle), LAYOUT)
    expect(style.borderRadius).toBeUndefined()
  })

  it('leaves a target key the source said nothing about', () => {
    freezeAtSnapFrame()
    releaseLayout('hero', par(0, 0, 50, 50), { backgroundColor: 'red' })

    const style = styleAfterLayout(target(), LAYOUT)
    expect(style.backgroundColor).toBe('red')
    expect(style.borderRadius).toBe(12)
  })

  it('publishes its carried values when it unmounts', () => {
    const ui = target()
    const view = render(ui)
    fireLayout(view.getByTestId('el') as never, LAYOUT)
    view.unmount()

    expect(consumeLayout('hero')?.styles).toEqual({
      backgroundColor: 'blue',
      borderRadius: 12,
      opacity: 1,
    })
  })

  it('offers a live read while it is still mounted', () => {
    const view = render(target())
    fireLayout(view.getByTestId('el') as never, LAYOUT)

    expect(consumeLayout('hero')?.readStyles?.()).toEqual({
      backgroundColor: 'blue',
      borderRadius: 12,
      opacity: 1,
    })
  })

  it('prefers a live source read over the stored snapshot', () => {
    // Same reasoning as the rect re-measure: a mounted source's values move
    // without a layout pass, so the stored snapshot is a floor, not the truth.
    freezeAtSnapFrame()
    registerLayout('hero', par(0, 0, 50, 50), undefined, () => ({
      backgroundColor: 'green',
    }))

    const style = styleAfterLayout(target(), LAYOUT)
    expect(style.backgroundColor).toBe('green')
  })

  it('never carries transform keys — the FLIP owns them', () => {
    // Carrying a transform would apply the same displacement twice.
    const ui = (
      <Motion.View
        testID="el"
        layoutId="hero"
        style={redBox}
        animate={{ translateX: 30, scale: 2 }}
      />
    )
    const view = render(ui)
    fireLayout(view.getByTestId('el') as never, LAYOUT)
    view.unmount()

    expect(consumeLayout('hero')?.styles).toEqual({ backgroundColor: 'red' })
  })

  it('does not activate a carried key the element has no value for', () => {
    // A `Motion.Text` that inherits its colour from a parent has no `color` of
    // its own. Activating it anyway would rest it at the generic default —
    // 'transparent' — and the text would vanish on an element the consumer
    // only asked to move. Same failure mode as the `0.0.3` P0 regression,
    // reached from the other side.
    freezeAtSnapFrame()
    releaseLayout('hero', par(0, 0, 50, 50), { color: 'red' })

    const view = render(
      <Motion.Text testID="el" layoutId="hero" style={textStyle}>
        hi
      </Motion.Text>,
    )
    fireLayout(view.getByTestId('el') as never, LAYOUT)

    expect(getStyle(view.getByTestId('el') as never).color).toBeUndefined()
  })

  it('a consumed source overrides `initial` for carried keys', () => {
    // `initial` seeds the base value; the carry composites above it. So on the
    // mount that consumes a source, the first frame shows the source's colour
    // regardless of what `initial` asked for.
    freezeAtSnapFrame()
    releaseLayout('hero', par(0, 0, 50, 50), { backgroundColor: 'red' })

    const style = styleAfterLayout(
      <Motion.View
        testID="el"
        layoutId="hero"
        style={boxStyle}
        initial={{ backgroundColor: 'yellow' }}
        animate={{ backgroundColor: 'blue' }}
      />,
      LAYOUT,
    )
    expect(style.backgroundColor).toBe('red')
  })

  it('reduced motion snaps, matching the rect path', () => {
    jest.spyOn(Reanimated, 'useReducedMotion').mockReturnValue(true)
    freezeAtSnapFrame()
    releaseLayout('hero', par(0, 0, 50, 50), SOURCE)

    const style = styleAfterLayout(target(), LAYOUT)
    expect(style.backgroundColor).toBe('blue')
    expect(style.borderRadius).toBe(12)
  })

  it('`no-animation` snaps too', () => {
    freezeAtSnapFrame()
    releaseLayout('hero', par(0, 0, 50, 50), SOURCE)

    const style = styleAfterLayout(
      <Motion.View
        testID="el"
        layoutId="hero"
        style={targetStyle}
        transition={{ type: 'no-animation' }}
      />,
      LAYOUT,
    )
    expect(style.backgroundColor).toBe('blue')
  })

  it('skips the carry when source and target are in different spaces', () => {
    // Half a shared-element transition reads as a glitch, not as graceful
    // degradation — if the rect is skipped, so is the style.
    freezeAtSnapFrame()
    releaseLayout('hero', par(0, 0, 50, 50), SOURCE)
    stubMeasurements({ x: 10, y: 410, width: 100, height: 100 })

    const style = styleAfterLayout(target(), LAYOUT)
    expect(style.backgroundColor).toBe('blue')
  })
})

// The measurement contract itself, against the real `measureInWindow` path
// (no stub) — see `measureWindow.ts` for why synchronous-or-nothing is the
// rule rather than a limitation.
describe('measureWindowRect', () => {
  it('reads a synchronous measurement', () => {
    const node = {
      measureInWindow: (cb: (...a: number[]) => void) => cb(10, 410, 100, 100),
    }
    expect(measureWindowRect(node)).toEqual(win(10, 410, 100, 100))
  })

  it('treats an asynchronous measurement as unavailable', () => {
    // Paper answers over the bridge a tick later. Accepting that would put the
    // element in window space while its counterpart stayed parent-relative,
    // and mixed spaces cancel the transition — so the late answer is dropped.
    let late: ((...a: number[]) => void) | undefined
    const node = {
      measureInWindow: (cb: (...a: number[]) => void) => {
        late = cb
      },
    }
    expect(measureWindowRect(node)).toBeUndefined()
    expect(() => late?.(10, 410, 100, 100)).not.toThrow()
  })

  it('treats a node with no measureInWindow as unavailable', () => {
    expect(measureWindowRect({})).toBeUndefined()
    expect(measureWindowRect(null)).toBeUndefined()
  })

  it('rejects a zero-sized measurement', () => {
    const node = {
      measureInWindow: (cb: (...a: number[]) => void) => cb(0, 0, 0, 0),
    }
    expect(measureWindowRect(node)).toBeUndefined()
  })

  it('rejects a non-finite measurement', () => {
    const node = {
      measureInWindow: (cb: (...a: number[]) => void) => cb(NaN, 0, 100, 100),
    }
    expect(measureWindowRect(node)).toBeUndefined()
  })

  it('survives a host that throws on a detached node', () => {
    const node = {
      measureInWindow: () => {
        throw new Error('detached')
      },
    }
    expect(measureWindowRect(node)).toBeUndefined()
  })
})

// Regression: the registry only ever shrank through `consumeLayout` /
// `peekSharedLayout`. A `layoutId` that unmounted and was never remounted left
// its rect in the module-level Map for the lifetime of the process — fine for a
// handful of hero images, not fine for per-item ids in a long-lived list
// (`layoutId={`photo-${item.id}`}`), where nothing ever consumes the release.
//
// Writes now amortize an expiry sweep: at most one full scan per TTL window, so
// a burst of layout events doesn't become a burst of scans.
describe('sharedRegistry — expiry sweep', () => {
  const RECT = par(0, 0, 10, 10)

  afterEach(() => {
    clearSharedRegistry()
    __setSharedLayoutClock(undefined)
  })

  it('evicts released rects that nothing ever consumed', () => {
    let now = 1_000
    __setSharedLayoutClock(() => now)

    for (let i = 0; i < 50; i++) releaseLayout(`photo-${i}`, RECT)
    expect(__sharedRegistrySize()).toBe(50)

    // Past the TTL, the next write sweeps the abandoned entries.
    now += SHARED_LAYOUT_TTL_MS + 1
    releaseLayout('photo-fresh', RECT)
    expect(__sharedRegistrySize()).toBe(1)
    expect(peekSharedLayout('photo-fresh')).toEqual(RECT)
  })

  it('does not grow without bound across many mount/unmount cycles', () => {
    let now = 1_000
    __setSharedLayoutClock(() => now)

    for (let i = 0; i < 500; i++) {
      registerLayout(`row-${i}`, RECT)
      releaseLayout(`row-${i}`, RECT)
      now += SHARED_LAYOUT_TTL_MS + 1
    }
    expect(__sharedRegistrySize()).toBeLessThanOrEqual(2)
  })

  it('keeps entries that are still inside their TTL', () => {
    let now = 1_000
    __setSharedLayoutClock(() => now)

    releaseLayout('hero', RECT)
    now += SHARED_LAYOUT_TTL_MS - 1
    releaseLayout('other', RECT)

    expect(peekSharedLayout('hero')).toEqual(RECT)
    expect(__sharedRegistrySize()).toBe(2)
  })

  it('a still-mounted element re-registers after its entry is swept', () => {
    let now = 1_000
    __setSharedLayoutClock(() => now)

    registerLayout('hero', RECT)
    now += SHARED_LAYOUT_TTL_MS * 3
    registerLayout('unrelated', RECT)
    expect(peekSharedLayout('hero')).toBeUndefined()

    releaseLayout('hero', RECT)
    expect(consumeLayout('hero')?.rect).toEqual(RECT)
  })

  it('still hands a fresh release to the next mount', () => {
    let now = 1_000
    __setSharedLayoutClock(() => now)

    releaseLayout('hero', RECT)
    now += 10
    expect(consumeLayout('hero')?.rect).toEqual(RECT)
  })
})
