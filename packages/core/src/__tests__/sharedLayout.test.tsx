import { act, render, renderHook } from '@testing-library/react-native'
import * as Reanimated from 'react-native-reanimated'
import { Motion } from '../motion'
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

  it('cancels its four FLIP values on unmount', () => {
    // Tested on the hook rather than through a primitive: the factory cancels
    // ~two dozen of its own values too, which would bury the four this hook
    // owns. They were missed by the `0.0.2` unmount-cancel pass.
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
    expect(spy).toHaveBeenCalledTimes(4)
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
