import { fireEvent, screen } from '@testing-library/react-native'
import { type ReactElement } from 'react'
import { Motion } from '../motion'
import { flushMotion, renderWithMotion } from '../testing'

// Regression: `gesture={{ pressed }}` was wired through `onTouchStart` /
// `onTouchEnd` plus the Pressable-only `onPressIn` / `onPressOut`. Under
// react-native-web `onTouchStart` reaches the DOM as a real `touchstart`
// listener, which a mouse never fires — so on desktop web a plain
// `Motion.View` was completely inert under a click, while `Motion.Pressable`
// worked because it has the `onPressIn` path. Web pointer events now sit
// alongside the touch pair so `pressed` means "any pointer" everywhere.
//
// The gap survived six releases because every existing gesture test fires
// `pressIn` — the one modality that already worked. Each modality below is
// asserted independently for that reason: covering only the convenient one is
// what hid this.

type Rendered = ReturnType<typeof renderWithMotion>

function getStyle(
  node: { props: { style?: unknown } } | null,
): Record<string, unknown> {
  if (!node) return {}
  const raw = node.props.style
  const flat = Array.isArray(raw) ? raw.flat(Infinity) : [raw]
  return Object.assign({}, ...flat.filter(Boolean))
}

function widthOf(result: Rendered): number {
  return getStyle(result.toJSON() as never).width as number
}

const box = { width: 200, height: 100 }
const TRANSITION = { type: 'timing', duration: 100 } as const

function view(): ReactElement {
  return (
    <Motion.View
      testID="card"
      style={box}
      gesture={{ pressed: { width: 50 } }}
      transition={TRANSITION}
    />
  )
}

/** Press-in event name -> the release event that must undo it. */
const MODALITIES: ReadonlyArray<readonly [string, string, string]> = [
  ['touch', 'touchStart', 'touchEnd'],
  ['pointer (mouse / pen / touch on web)', 'pointerDown', 'pointerUp'],
  ['press (Pressable-style hosts)', 'pressIn', 'pressOut'],
]

describe('gesture pressed responds to every input modality', () => {
  for (const [label, down, up] of MODALITIES) {
    it(`${label}: ${down} engages the layer and ${up} releases it`, () => {
      const ui = view()
      const result = renderWithMotion(ui)
      expect(widthOf(result)).toBe(200)

      fireEvent(screen.getByTestId('card'), down)
      flushMotion(result, ui)
      expect(widthOf(result)).toBeCloseTo(50)

      fireEvent(screen.getByTestId('card'), up)
      flushMotion(result, ui)
      expect(widthOf(result)).toBeCloseTo(200)
    })
  }

  it('pointerCancel releases the layer', () => {
    const ui = view()
    const result = renderWithMotion(ui)

    fireEvent(screen.getByTestId('card'), 'pointerDown')
    flushMotion(result, ui)
    expect(widthOf(result)).toBeCloseTo(50)

    // The browser takes the gesture over (scroll / drag start). Without this
    // the pressed layer sticks on after the pointer is gone.
    fireEvent(screen.getByTestId('card'), 'pointerCancel')
    flushMotion(result, ui)
    expect(widthOf(result)).toBeCloseTo(200)
  })

  it('a web touch firing both touchStart and pointerDown is idempotent', () => {
    const ui = view()
    const result = renderWithMotion(ui)

    // Real browsers emit both for one finger; they set the same boolean to the
    // same value, so the overlap must not double-toggle or stick.
    fireEvent(screen.getByTestId('card'), 'touchStart')
    fireEvent(screen.getByTestId('card'), 'pointerDown')
    flushMotion(result, ui)
    expect(widthOf(result)).toBeCloseTo(50)

    fireEvent(screen.getByTestId('card'), 'touchEnd')
    fireEvent(screen.getByTestId('card'), 'pointerUp')
    flushMotion(result, ui)
    expect(widthOf(result)).toBeCloseTo(200)
  })

  it('composes with a consumer’s own pointer handlers', () => {
    const onPointerDown = jest.fn()
    const onPointerUp = jest.fn()
    const ui = (
      <Motion.View
        testID="card"
        style={box}
        gesture={{ pressed: { width: 50 } }}
        transition={TRANSITION}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
      />
    )
    const result = renderWithMotion(ui)

    fireEvent(screen.getByTestId('card'), 'pointerDown')
    flushMotion(result, ui)
    expect(onPointerDown).toHaveBeenCalledTimes(1)
    expect(widthOf(result)).toBeCloseTo(50)

    fireEvent(screen.getByTestId('card'), 'pointerUp')
    flushMotion(result, ui)
    expect(onPointerUp).toHaveBeenCalledTimes(1)
    expect(widthOf(result)).toBeCloseTo(200)
  })

  it('mounts no pointer handlers when pressed is not declared', () => {
    const result = renderWithMotion(
      <Motion.View testID="card" style={box} gesture={{ hovered: {} }} />,
    )
    const props = (
      result.toJSON() as never as { props: Record<string, unknown> }
    ).props
    expect(props.onPointerDown).toBeUndefined()
    expect(props.onPointerUp).toBeUndefined()
    expect(props.onPointerCancel).toBeUndefined()
  })
})
