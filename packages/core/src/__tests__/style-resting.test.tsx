import { fireEvent, screen } from '@testing-library/react-native'
import { cloneElement, type ReactElement } from 'react'
import { StyleSheet } from 'react-native'
import { Motion } from '../motion'
import { flushMotion, renderWithMotion } from '../testing'

// Regression: a key that appears ONLY in `gesture`, `exit`, or a variant
// branch that isn't current still joins the active key set — the worklet has
// to know about it so the layer/branch can drive it later. But the animated
// style merges AFTER the static `style` prop, so if such a key rests at its
// generic default the animated style silently overrides whatever `style` set:
// `borderColor` went to 'transparent', `width` to 0, and a focus ring or a
// sized box simply vanished before the user touched anything.
//
// Undriven keys must therefore rest at the static style's own value. Transform
// keys and `opacity` masked this for a long time because their defaults (1, 0,
// 1) happen to be identities — every case below uses a key whose default is
// visibly wrong.

type Rendered = ReturnType<typeof renderWithMotion>

function update(result: Rendered, ui: ReactElement): void {
  result.rerender(ui)
  flushMotion(result, ui)
}

function getStyle(
  node: { props: { style?: unknown } } | null,
): Record<string, unknown> {
  if (!node) return {}
  const raw = node.props.style
  const flat = Array.isArray(raw) ? raw.flat(Infinity) : [raw]
  return Object.assign({}, ...flat.filter(Boolean))
}

function transformOf(style: Record<string, unknown>): Record<string, unknown> {
  const t = style.transform as Array<Record<string, unknown>> | undefined
  if (!t) return {}
  return Object.assign({}, ...t)
}

const ring = { borderColor: 'grey', borderWidth: 2 }
const box = { width: 200, height: 100, backgroundColor: 'blue' }
const raised = { elevation: 4, shadowRadius: 8, shadowOpacity: 0.3 }
const rounded = { borderRadius: 12 }
const text = { color: 'black' }
const offset = { shadowOffset: { width: 3, height: 5 } }
const scaled = { transform: [{ scale: 2 }, { translateX: 40 }] }
const rotated = { transform: [{ rotate: '45deg' }] }
const sheet = StyleSheet.create({ card: { width: 300, borderColor: 'red' } })
const allNumeric = { ...box, ...raised, ...rounded }
const allColors = {
  ...text,
  ...ring,
  backgroundColor: 'blue',
  shadowColor: 'red',
}
const percentWidth = { width: '100%' } as const

describe('undriven keys rest at the static style value', () => {
  it('gesture-only color key keeps the style colour at rest', () => {
    const result = renderWithMotion(
      <Motion.View
        testID="box"
        style={ring}
        gesture={{ focused: { borderColor: '#4f46e5' } }}
      />,
    )
    expect(getStyle(result.toJSON() as never).borderColor).toBe('grey')
  })

  it('gesture-only backgroundColor alongside a driven opacity', () => {
    const result = renderWithMotion(
      <Motion.View
        testID="box"
        style={box}
        animate={{ opacity: 1 }}
        gesture={{ pressed: { backgroundColor: 'red' } }}
      />,
    )
    const style = getStyle(result.toJSON() as never)
    expect(style.backgroundColor).toBe('blue')
    expect(style.opacity).toBe(1)
  })

  it('exit-only key does not collapse the element before it exits', () => {
    const result = renderWithMotion(
      <Motion.View
        testID="box"
        style={box}
        animate={{ opacity: 1 }}
        exit={{ width: 0, backgroundColor: 'black' }}
      />,
    )
    const style = getStyle(result.toJSON() as never)
    expect(style.width).toBe(200)
    expect(style.backgroundColor).toBe('blue')
  })

  it('key present in only one variant survives the other branch', () => {
    const variants = {
      closed: { opacity: 0 },
      open: { opacity: 1, width: 300 },
    }
    const result = renderWithMotion(
      <Motion.View
        testID="box"
        style={box}
        variants={variants}
        animate="closed"
      />,
    )
    const style = getStyle(result.toJSON() as never)
    expect(style.width).toBe(200)
    expect(style.opacity).toBe(0)
  })

  it('covers every numeric key whose default is not an identity', () => {
    const result = renderWithMotion(
      <Motion.View
        testID="box"
        style={allNumeric}
        gesture={{
          hovered: {
            elevation: 12,
            shadowRadius: 16,
            shadowOpacity: 0.6,
            borderRadius: 24,
            width: 240,
            height: 120,
          },
        }}
      />,
    )
    const style = getStyle(result.toJSON() as never)
    expect(style).toMatchObject({
      width: 200,
      height: 100,
      elevation: 4,
      shadowRadius: 8,
      shadowOpacity: 0.3,
      borderRadius: 12,
    })
  })

  it('covers every color key', () => {
    const result = renderWithMotion(
      <Motion.Text
        testID="t"
        style={allColors}
        gesture={{
          pressed: {
            color: 'white',
            borderColor: 'black',
            backgroundColor: 'green',
            shadowColor: 'purple',
          },
        }}
      >
        hi
      </Motion.Text>,
    )
    expect(getStyle(result.toJSON() as never)).toMatchObject({
      color: 'black',
      borderColor: 'grey',
      backgroundColor: 'blue',
      shadowColor: 'red',
    })
  })

  it('reads transform keys out of the style transform array', () => {
    const result = renderWithMotion(
      <Motion.View
        testID="box"
        style={scaled}
        gesture={{ pressed: { scale: 0.9, translateX: 0 } }}
      />,
    )
    expect(transformOf(getStyle(result.toJSON() as never))).toMatchObject({
      scale: 2,
      translateX: 40,
    })
  })

  it('converts a unit-suffixed style rotation to degrees', () => {
    const result = renderWithMotion(
      <Motion.View
        testID="box"
        style={rotated}
        gesture={{ pressed: { rotate: 90 } }}
      />,
    )
    expect(transformOf(getStyle(result.toJSON() as never)).rotate).toBe('45deg')
  })

  it('decomposes a style shadowOffset into both synthetic axes', () => {
    const result = renderWithMotion(
      <Motion.View
        testID="box"
        style={offset}
        gesture={{ hovered: { shadowOffset: { width: 0, height: 12 } } }}
      />,
    )
    expect(getStyle(result.toJSON() as never).shadowOffset).toEqual({
      width: 3,
      height: 5,
    })
  })

  it('flattens style arrays and registered StyleSheet entries', () => {
    const result = renderWithMotion(
      <Motion.View
        testID="box"
        style={[sheet.card, ring]}
        gesture={{ focused: { borderColor: '#4f46e5', width: 400 } }}
      />,
    )
    const style = getStyle(result.toJSON() as never)
    // Later entries win in a style array — `ring` overrides the sheet's red.
    expect(style.borderColor).toBe('grey')
    expect(style.width).toBe(300)
  })

  it('falls back to the resting default when the style omits the key', () => {
    const result = renderWithMotion(
      <Motion.View
        testID="box"
        style={box}
        gesture={{ hovered: { elevation: 12 } }}
      />,
    )
    // Nothing set elevation, so 0 is the honest resting value.
    expect(getStyle(result.toJSON() as never).elevation).toBe(0)
  })

  it('ignores a non-numeric style value rather than seeding it', () => {
    const result = renderWithMotion(
      <Motion.View
        testID="box"
        style={percentWidth}
        gesture={{ pressed: { width: 50 } }}
      />,
    )
    // '100%' can't be interpolated as a number, so the slot stays at 0 rather
    // than seeding a string a later withTiming would produce NaN from.
    expect(getStyle(result.toJSON() as never).width).toBe(0)
  })

  it('a driven key still wins over the style', () => {
    const result = renderWithMotion(
      <Motion.View
        testID="box"
        style={box}
        animate={{ width: 500 }}
        gesture={{ pressed: { width: 50 } }}
      />,
    )
    expect(getStyle(result.toJSON() as never).width).toBe(500)
  })

  it('tracks a style value that changes after mount', () => {
    const result = renderWithMotion(
      <Motion.View
        testID="box"
        style={ring}
        gesture={{ focused: { borderColor: '#4f46e5' } }}
      />,
    )
    expect(getStyle(result.toJSON() as never).borderColor).toBe('grey')

    const dark = { borderColor: 'white', borderWidth: 2 }
    update(
      result,
      <Motion.View
        testID="box"
        style={dark}
        gesture={{ focused: { borderColor: '#4f46e5' } }}
      />,
    )
    expect(getStyle(result.toJSON() as never).borderColor).toBe('white')
  })

  it('leaves a key where the last variant put it, not back at the style', () => {
    const variants = {
      closed: { opacity: 0 },
      open: { opacity: 1, width: 300 },
    }
    const ui = (key: 'open' | 'closed') => (
      <Motion.View
        testID="box"
        style={box}
        variants={variants}
        animate={key}
        transition={{ type: 'timing', duration: 100 }}
      />
    )
    const result = renderWithMotion(ui('closed'))
    expect(getStyle(result.toJSON() as never).width).toBe(200)

    update(result, ui('open'))
    expect(getStyle(result.toJSON() as never).width).toBe(300)

    // Switching to a branch that doesn't mention `width` holds the last driven
    // value — the pre-existing semantic, deliberately not changed here.
    update(result, ui('closed'))
    expect(getStyle(result.toJSON() as never).width).toBe(300)
  })

  it('initial still wins over the style for the mount frame', () => {
    const result = renderWithMotion(
      <Motion.View
        testID="box"
        style={box}
        initial={{ width: 10 }}
        animate={{ width: 10 }}
        gesture={{ pressed: { width: 50 } }}
      />,
    )
    expect(getStyle(result.toJSON() as never).width).toBe(10)
  })
})

// The resting fix is only half the contract: the layer has to blend FROM the
// style-derived base, not from the generic default. Getting the rest frame
// right while the press still animated out of 'transparent' would just move
// the flash rather than remove it.
describe('gesture layers blend from the style-derived base', () => {
  const flush = (
    result: ReturnType<typeof renderWithMotion>,
    ui: ReactElement,
  ): void => {
    result.rerender(cloneElement(ui))
  }

  it('a numeric layer reaches its target from a style base', () => {
    const ui = (
      <Motion.Pressable
        testID="card"
        style={box}
        gesture={{ pressed: { width: 50 } }}
        transition={{ type: 'timing', duration: 100 }}
      />
    )
    const result = renderWithMotion(ui)
    expect(getStyle(result.toJSON() as never).width).toBe(200)

    fireEvent(screen.getByTestId('card'), 'pressIn')
    flush(result, ui)
    expect(getStyle(result.toJSON() as never).width).toBeCloseTo(50)

    fireEvent(screen.getByTestId('card'), 'pressOut')
    flush(result, ui)
    // Releases back to the style value, not to 0.
    expect(getStyle(result.toJSON() as never).width).toBeCloseTo(200)
  })

  it('a color layer round-trips to the style colour on release', () => {
    const ui = (
      <Motion.Pressable
        testID="card"
        style={ring}
        gesture={{ pressed: { borderColor: 'rgba(0, 0, 255, 1)' } }}
        transition={{ type: 'timing', duration: 100 }}
      />
    )
    const result = renderWithMotion(ui)
    expect(getStyle(result.toJSON() as never).borderColor).toBe('grey')

    fireEvent(screen.getByTestId('card'), 'pressIn')
    flush(result, ui)
    expect(getStyle(result.toJSON() as never).borderColor).toBe(
      'rgba(0, 0, 255, 1)',
    )

    fireEvent(screen.getByTestId('card'), 'pressOut')
    flush(result, ui)
    expect(getStyle(result.toJSON() as never).borderColor).toBe('grey')
  })
})
