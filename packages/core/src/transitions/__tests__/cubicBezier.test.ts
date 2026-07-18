import * as Reanimated from 'react-native-reanimated'
import { cubicBezier } from '../cubicBezier'
import { ensureWorkletEasing } from '../easing'

// §3.2 cubicBezier(): number form, W3C CSS string form, and the CSS easing
// keywords, all delegating to Reanimated's `Easing.bezier` (except 'linear').
// The jest mock's `Easing.bezier` ignores its args, so control-point
// assertions spy on the call.

describe('cubicBezier', () => {
  beforeEach(() => {
    jest.restoreAllMocks()
  })

  it('number form delegates to Easing.bezier with the control points', () => {
    const bezier = jest.spyOn(Reanimated.Easing, 'bezier')
    cubicBezier(0.2, 0, 0, 1)
    expect(bezier).toHaveBeenCalledWith(0.2, 0, 0, 1)
  })

  it('parses the CSS cubic-bezier(...) token form', () => {
    const bezier = jest.spyOn(Reanimated.Easing, 'bezier')
    cubicBezier('cubic-bezier(0.2, 0, 0, 1)')
    expect(bezier).toHaveBeenCalledWith(0.2, 0, 0, 1)
  })

  it('tolerates whitespace, leading-dot numbers, and negative y overshoot', () => {
    const bezier = jest.spyOn(Reanimated.Easing, 'bezier')
    cubicBezier('  cubic-bezier( .34 , -0.55 , 0.27 , 1.55 )  ')
    expect(bezier).toHaveBeenCalledWith(0.34, -0.55, 0.27, 1.55)
  })

  it('maps CSS keywords to their canonical control points', () => {
    const bezier = jest.spyOn(Reanimated.Easing, 'bezier')
    cubicBezier('ease')
    cubicBezier('ease-in')
    cubicBezier('ease-out')
    cubicBezier('EASE-IN-OUT') // keywords are case-insensitive per CSS
    expect(bezier.mock.calls).toEqual([
      [0.25, 0.1, 0.25, 1],
      [0.42, 0, 1, 1],
      [0, 0, 0.58, 1],
      [0.42, 0, 0.58, 1],
    ])
  })

  it("maps 'linear' to Easing.linear, not a degenerate bezier", () => {
    const bezier = jest.spyOn(Reanimated.Easing, 'bezier')
    expect(cubicBezier('linear')).toBe(Reanimated.Easing.linear)
    expect(bezier).not.toHaveBeenCalled()
  })

  it('returns a value the easing pipeline accepts', () => {
    const easing = ensureWorkletEasing(cubicBezier('ease-out'))
    expect(typeof easing).toBe('function')
    const linear = ensureWorkletEasing(cubicBezier('linear'))
    expect(linear!(0.5)).toBe(0.5)
  })

  it('works end-to-end as timing.easing on the resolver', () => {
    const withTiming = jest.spyOn(Reanimated, 'withTiming')
    const { resolveTransition } = jest.requireActual('../resolve')
    resolveTransition(
      { type: 'timing', duration: 150, easing: cubicBezier('ease-out') },
      1,
    )
    expect(withTiming).toHaveBeenCalledTimes(1)
    const options = withTiming.mock.calls[0]![1] as { easing: unknown }
    expect(typeof options.easing).toBe('function')
  })

  it('throws on unsupported tokens and malformed strings', () => {
    expect(() => cubicBezier('step-start')).toThrow(/unsupported easing token/)
    expect(() => cubicBezier('bezier(0, 0, 1, 1)')).toThrow(
      /unsupported easing token/,
    )
    expect(() => cubicBezier('cubic-bezier(0.2, 0, 0)')).toThrow(
      /four finite numbers/,
    )
    expect(() => cubicBezier('cubic-bezier(0.2, 0, 0, oops)')).toThrow(
      /four finite numbers/,
    )
  })

  it('throws when x control points leave [0, 1]', () => {
    expect(() => cubicBezier(1.2, 0, 0, 1)).toThrow(/x1 and x2/)
    expect(() => cubicBezier('cubic-bezier(0, 0, -0.1, 1)')).toThrow(
      /x1 and x2/,
    )
  })

  it('throws on non-finite number-form arguments', () => {
    expect(() => cubicBezier(Number.NaN, 0, 0, 1)).toThrow(/finite number/)
    expect(() => cubicBezier(0.2, Number.POSITIVE_INFINITY, 0, 1)).toThrow(
      /finite number/,
    )
  })
})
