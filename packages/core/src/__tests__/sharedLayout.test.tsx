import { act, render } from '@testing-library/react-native'
import * as Reanimated from 'react-native-reanimated'
import { Motion } from '../motion'
import {
  __setSharedLayoutClock,
  clearSharedRegistry,
  consumeLayout,
  peekSharedLayout,
  registerLayout,
  releaseLayout,
  SHARED_LAYOUT_TTL_MS,
} from '../layout'

const boxStyle = { width: 50, height: 50 }

// Helper: fire the rendered Motion primitive's `onLayout` with a synthetic
// nativeEvent. The hook's fallback path (when there's no real
// `measureInWindow` available) uses these coords directly, so we don't
// need to stub a measurement bridge on the test renderer.
function fireMeasuredLayout(
  node: { props: Record<string, unknown> },
  rect: { x: number; y: number; width: number; height: number },
) {
  const onLayout = node.props.onLayout as ((event: unknown) => void) | undefined
  act(() => {
    onLayout?.({
      nativeEvent: { layout: { ...rect } },
    })
  })
}

describe('sharedRegistry', () => {
  beforeEach(() => {
    clearSharedRegistry()
    __setSharedLayoutClock(undefined)
  })

  it('register/peek/consume — happy path', () => {
    registerLayout('hero', { x: 10, y: 20, width: 100, height: 200 })
    expect(peekSharedLayout('hero')).toEqual({
      x: 10,
      y: 20,
      width: 100,
      height: 200,
    })
    const r = consumeLayout('hero')
    expect(r).toEqual({ x: 10, y: 20, width: 100, height: 200 })
    // Consumed entry is removed — second consume returns undefined.
    expect(consumeLayout('hero')).toBeUndefined()
  })

  it('expired entries are dropped on consume', () => {
    let now = 1000
    __setSharedLayoutClock(() => now)
    registerLayout('hero', { x: 0, y: 0, width: 10, height: 10 })
    now += SHARED_LAYOUT_TTL_MS + 1
    expect(consumeLayout('hero')).toBeUndefined()
    // peek also treats expired as missing
    registerLayout('hero', { x: 1, y: 1, width: 1, height: 1 })
    now += SHARED_LAYOUT_TTL_MS + 1
    expect(peekSharedLayout('hero')).toBeUndefined()
  })

  it('releaseLayout overwrites the entry with a fresh TTL', () => {
    let now = 1000
    __setSharedLayoutClock(() => now)
    registerLayout('hero', { x: 0, y: 0, width: 0, height: 0 })
    now += SHARED_LAYOUT_TTL_MS - 1
    releaseLayout('hero', { x: 5, y: 5, width: 5, height: 5 })
    now += SHARED_LAYOUT_TTL_MS - 1 // still within the fresh TTL
    expect(peekSharedLayout('hero')).toEqual({
      x: 5,
      y: 5,
      width: 5,
      height: 5,
    })
  })

  it('different ids are isolated', () => {
    registerLayout('a', { x: 1, y: 1, width: 1, height: 1 })
    registerLayout('b', { x: 2, y: 2, width: 2, height: 2 })
    expect(consumeLayout('a')).toEqual({ x: 1, y: 1, width: 1, height: 1 })
    expect(consumeLayout('b')).toEqual({ x: 2, y: 2, width: 2, height: 2 })
  })
})

describe('Motion.* — layoutId integration', () => {
  beforeEach(() => {
    clearSharedRegistry()
    __setSharedLayoutClock(undefined)
    jest.restoreAllMocks()
  })

  it('no-op when no source rect is in the registry', () => {
    const withSpring = jest.spyOn(Reanimated, 'withSpring')
    const view = render(
      <Motion.View testID="el" layoutId="hero" style={boxStyle} />,
    )
    const node = view.getByTestId('el')
    fireMeasuredLayout(node as never, { x: 100, y: 100, width: 50, height: 50 })
    // No source — no FLIP withSpring calls. Other Reanimated calls from
    // animate-less mount stay at zero.
    expect(withSpring).not.toHaveBeenCalled()
    // Registry holds the latest measured rect so a future remount can FLIP
    // from this one.
    expect(peekSharedLayout('hero')).toEqual({
      x: 100,
      y: 100,
      width: 50,
      height: 50,
    })
  })

  it('consumes a source rect on first layout and kicks off FLIP', () => {
    const withSpring = jest.spyOn(Reanimated, 'withSpring')
    const withSequence = jest.spyOn(Reanimated, 'withSequence')
    // Seed the registry as if a previous Motion.View with layoutId="hero"
    // had unmounted at (0, 0, 50, 50).
    registerLayout('hero', { x: 0, y: 0, width: 50, height: 50 })

    const view = render(
      <Motion.View testID="el" layoutId="hero" style={boxStyle} />,
    )
    const node = view.getByTestId('el')
    fireMeasuredLayout(node as never, {
      x: 100,
      y: 100,
      width: 100,
      height: 100,
    })

    // FLIP fires four withSequence(snap, withSpring(toIdentity)) pairs —
    // one each for dx, dy, sx, sy. The default-spring path uses withSpring
    // for the second leg.
    expect(withSequence).toHaveBeenCalledTimes(4)
    expect(withSpring).toHaveBeenCalledTimes(4)
  })

  it('reduced motion skips the FLIP animation', () => {
    jest.spyOn(Reanimated, 'useReducedMotion').mockReturnValue(true)
    const withSpring = jest.spyOn(Reanimated, 'withSpring')
    const withSequence = jest.spyOn(Reanimated, 'withSequence')
    registerLayout('hero', { x: 0, y: 0, width: 50, height: 50 })

    const view = render(
      <Motion.View testID="el" layoutId="hero" style={boxStyle} />,
    )
    fireMeasuredLayout(view.getByTestId('el') as never, {
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
    registerLayout('hero', { x: 0, y: 0, width: 50, height: 50 })

    const view = render(
      <Motion.View testID="el" layoutId="hero" style={boxStyle} />,
    )
    const node = view.getByTestId('el')
    fireMeasuredLayout(node as never, {
      x: 100,
      y: 100,
      width: 100,
      height: 100,
    })
    expect(withSpring).toHaveBeenCalledTimes(4)

    // A second layout (resize, prop change, etc.) shouldn't re-trigger FLIP.
    // Re-seed the registry to prove the consume guard, not a missing source,
    // is what gates a second animation.
    registerLayout('hero', { x: 200, y: 200, width: 50, height: 50 })
    fireMeasuredLayout(node as never, {
      x: 100,
      y: 100,
      width: 110,
      height: 110,
    })
    expect(withSpring).toHaveBeenCalledTimes(4)
  })

  it('unmount releases the latest measured rect under the same id', () => {
    const view = render(
      <Motion.View testID="el" layoutId="hero" style={boxStyle} />,
    )
    fireMeasuredLayout(view.getByTestId('el') as never, {
      x: 100,
      y: 100,
      width: 50,
      height: 50,
    })
    expect(peekSharedLayout('hero')).toEqual({
      x: 100,
      y: 100,
      width: 50,
      height: 50,
    })

    // Unmount → releaseLayout fires with the last measurement. The entry
    // stays consumable for the next mount.
    view.unmount()
    expect(peekSharedLayout('hero')).toEqual({
      x: 100,
      y: 100,
      width: 50,
      height: 50,
    })
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
    // The mock forwards the ref callback to the rendered host node — userRef
    // gets called with the node instance.
    expect(userRef).toHaveBeenCalled()

    fireMeasuredLayout(view.getByTestId('el') as never, {
      x: 1,
      y: 2,
      width: 3,
      height: 4,
    })
    expect(userOnLayout).toHaveBeenCalledTimes(1)
  })
})

describe('Motion.* — layoutId omitted', () => {
  beforeEach(() => {
    clearSharedRegistry()
    jest.restoreAllMocks()
  })

  it('does not touch the registry when layoutId is omitted', () => {
    const view = render(<Motion.View testID="el" style={boxStyle} />)
    fireMeasuredLayout(view.getByTestId('el') as never, {
      x: 100,
      y: 100,
      width: 50,
      height: 50,
    })
    // No id → no registry entries.
    expect(peekSharedLayout('hero')).toBeUndefined()
  })
})
