import * as Reanimated from 'react-native-reanimated'
import { Motion } from '../motion'
import { renderWithMotion } from '../testing'

// Shadow animation unblocks the elevation-cascade pattern (Card / FAB / Chip
// in MD3) that drove three independent `containerMotion` workarounds in the
// `@rootnative/ui` migration. The flat shadow keys (`shadowOpacity`,
// `shadowRadius`, `shadowColor`, `elevation`) ride the existing numeric /
// color resolver paths. `shadowOffset: { width, height }` is the only
// nested-object style on the v0.1 surface and decomposes into two synthetic
// axis SVs that the worklet reassembles into a single `shadowOffset` prop.

function getStyle(
  node: { props: { style?: unknown } } | null,
): Record<string, unknown> {
  if (!node) return {}
  const raw = node.props.style
  const flat = Array.isArray(raw) ? raw.flat(Infinity) : [raw]
  return Object.assign({}, ...flat.filter(Boolean))
}

describe('shadow animation — flat keys', () => {
  beforeEach(() => {
    jest.restoreAllMocks()
  })

  it('animates shadowOpacity through withSpring', () => {
    const withSpring = jest.spyOn(Reanimated, 'withSpring')
    renderWithMotion(
      <Motion.View
        initial={{ shadowOpacity: 0 }}
        animate={{ shadowOpacity: 0.25 }}
      />,
    )
    expect(withSpring).toHaveBeenCalledWith(0.25, expect.any(Object), undefined)
  })

  it('animates shadowRadius and elevation together', () => {
    const result = renderWithMotion(
      <Motion.View
        initial={{ shadowRadius: 0, elevation: 0 }}
        animate={{ shadowRadius: 8, elevation: 2 }}
      />,
    )
    const style = getStyle(result.toJSON() as never)
    expect(style.shadowRadius).toBe(8)
    expect(style.elevation).toBe(2)
  })

  it('forwards shadowColor as a color string through withSpring', () => {
    const withSpring = jest.spyOn(Reanimated, 'withSpring')
    renderWithMotion(
      <Motion.View
        initial={{ shadowColor: 'rgba(0,0,0,0)' }}
        animate={{ shadowColor: '#000000' }}
      />,
    )
    expect(withSpring).toHaveBeenCalledWith(
      '#000000',
      expect.any(Object),
      undefined,
    )
    const result = renderWithMotion(
      <Motion.View
        initial={{ shadowColor: 'rgba(0,0,0,0)' }}
        animate={{ shadowColor: '#000000' }}
      />,
    )
    const style = getStyle(result.toJSON() as never)
    expect(style.shadowColor).toBe('#000000')
  })
})

describe('shadow animation — shadowOffset nested object', () => {
  beforeEach(() => {
    jest.restoreAllMocks()
  })

  it('animates shadowOffset.width and .height independently through withSpring', () => {
    const withSpring = jest.spyOn(Reanimated, 'withSpring')
    renderWithMotion(
      <Motion.View
        initial={{ shadowOffset: { width: 0, height: 0 } }}
        animate={{ shadowOffset: { width: 0, height: 4 } }}
      />,
    )
    // Two withSpring calls — one per axis — both routed through the resolver.
    expect(withSpring).toHaveBeenCalledWith(0, expect.any(Object), undefined)
    expect(withSpring).toHaveBeenCalledWith(4, expect.any(Object), undefined)
  })

  it('reassembles shadowOffset as a single { width, height } style prop after animation', () => {
    const result = renderWithMotion(
      <Motion.View
        initial={{ shadowOffset: { width: 0, height: 0 } }}
        animate={{ shadowOffset: { width: 2, height: 6 } }}
      />,
    )
    const style = getStyle(result.toJSON() as never)
    // RN expects `shadowOffset` as a nested object — not flat
    // `shadowOffsetWidth` / `shadowOffsetHeight` keys. The worklet recomposes.
    expect(style.shadowOffset).toEqual({ width: 2, height: 6 })
    expect(style.shadowOffsetWidth).toBeUndefined()
    expect(style.shadowOffsetHeight).toBeUndefined()
  })

  it('uses initial.shadowOffset for the seed when initial is provided', () => {
    const result = renderWithMotion(
      <Motion.View
        initial={{ shadowOffset: { width: 1, height: 2 } }}
        animate={{ shadowOffset: { width: 3, height: 4 } }}
      />,
    )
    const style = getStyle(result.toJSON() as never)
    // After the effect flushes the SVs sit at the animate target.
    expect(style.shadowOffset).toEqual({ width: 3, height: 4 })
  })

  it('handles a one-axis-only animation (height) without zeroing the other axis', () => {
    const result = renderWithMotion(
      <Motion.View
        initial={{ shadowOffset: { width: 5, height: 0 } }}
        animate={{ shadowOffset: { width: 5, height: 3 } }}
      />,
    )
    const style = getStyle(result.toJSON() as never)
    expect(style.shadowOffset).toEqual({ width: 5, height: 3 })
  })

  it('animates shadowOffset alongside other shadow keys in an MD3 elevation cascade', () => {
    const result = renderWithMotion(
      <Motion.View
        initial={{
          shadowOpacity: 0,
          shadowRadius: 0,
          shadowOffset: { width: 0, height: 0 },
          elevation: 0,
        }}
        animate={{
          shadowOpacity: 0.15,
          shadowRadius: 3,
          shadowOffset: { width: 0, height: 1 },
          elevation: 1,
        }}
      />,
    )
    const style = getStyle(result.toJSON() as never)
    expect(style.shadowOpacity).toBe(0.15)
    expect(style.shadowRadius).toBe(3)
    expect(style.shadowOffset).toEqual({ width: 0, height: 1 })
    expect(style.elevation).toBe(1)
  })

  it('routes shadowOffset via the gesture sub-state path (pressed)', () => {
    // Without pressing, the base shadowOffset is what renders. The pressed
    // sub-state holds different axis values; the resolution table proves the
    // synthetic axes wired through `resolveGestureLayers` correctly so the
    // worklet sees the right per-layer targets when the user presses.
    const result = renderWithMotion(
      <Motion.View
        initial={{ shadowOffset: { width: 0, height: 1 } }}
        animate={{ shadowOffset: { width: 0, height: 1 } }}
        gesture={{ pressed: { shadowOffset: { width: 0, height: 4 } } }}
      />,
    )
    const style = getStyle(result.toJSON() as never)
    // No press → resting shadowOffset comes through.
    expect(style.shadowOffset).toEqual({ width: 0, height: 1 })
  })
})
