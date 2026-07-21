import {
  pairBoxShadowLayers,
  parseBoxShadow,
  resolveBoxShadowInput,
} from '../boxShadow'

describe('parseBoxShadow', () => {
  it('parses a single layer with all four lengths and a color', () => {
    expect(parseBoxShadow('0px 1px 3px 1px rgba(0, 0, 0, 0.15)')).toEqual([
      {
        offsetX: 0,
        offsetY: 1,
        blurRadius: 3,
        spreadDistance: 1,
        color: 'rgba(0, 0, 0, 0.15)',
        inset: false,
      },
    ])
  })

  it('splits layers on top-level commas only (rgba commas stay intact)', () => {
    const layers = parseBoxShadow(
      '0px 1px 2px rgba(0,0,0,0.3), 0px 1px 3px 1px rgba(0,0,0,0.15)',
    )
    expect(layers).toHaveLength(2)
    expect(layers[0]!.color).toBe('rgba(0,0,0,0.3)')
    expect(layers[1]!.spreadDistance).toBe(1)
  })

  it('defaults blur/spread to 0 and color to black in the 2-length form', () => {
    expect(parseBoxShadow('2px 4px')).toEqual([
      {
        offsetX: 2,
        offsetY: 4,
        blurRadius: 0,
        spreadDistance: 0,
        color: 'black',
        inset: false,
      },
    ])
  })

  it('accepts unitless numbers, negative offsets/spread, and hex colors', () => {
    expect(parseBoxShadow('-2 0 4px -1px #00000026')).toEqual([
      {
        offsetX: -2,
        offsetY: 0,
        blurRadius: 4,
        spreadDistance: -1,
        color: '#00000026',
        inset: false,
      },
    ])
  })

  it('parses inset in any position and modern space-separated colors', () => {
    expect(parseBoxShadow('inset 0 2px 4px rgb(0 0 0 / 40%)')).toEqual([
      {
        offsetX: 0,
        offsetY: 2,
        blurRadius: 4,
        spreadDistance: 0,
        color: 'rgb(0 0 0 / 40%)',
        inset: true,
      },
    ])
    expect(parseBoxShadow('0 2px 4px black inset')[0]!.inset).toBe(true)
  })

  it("parses 'none' to an empty layer list", () => {
    expect(parseBoxShadow('none')).toEqual([])
    expect(parseBoxShadow('  NONE ')).toEqual([])
  })

  it('throws on non-px units, bad length counts, and garbage', () => {
    expect(() => parseBoxShadow('0 1em 2px black')).toThrow(/unsupported unit/)
    expect(() => parseBoxShadow('2px black')).toThrow(/expected 2-4 lengths/)
    expect(() => parseBoxShadow('1px 2px 3px 4px 5px black')).toThrow(
      /expected 2-4 lengths/,
    )
    expect(() => parseBoxShadow('')).toThrow(/empty string/)
    expect(() => parseBoxShadow('0 2px 4px red blue')).toThrow(
      /multiple colors/,
    )
    expect(() => parseBoxShadow('inset inset 0 2px')).toThrow(
      /duplicate 'inset'/,
    )
    expect(() => parseBoxShadow('0 0 -4px black')).toThrow(
      /negative blur radius/,
    )
  })
})

describe('resolveBoxShadowInput', () => {
  it('passes structured layers through with defaults applied', () => {
    expect(
      resolveBoxShadowInput([{ offsetX: 1, offsetY: 2, color: 'red' }]),
    ).toEqual([
      {
        offsetX: 1,
        offsetY: 2,
        blurRadius: 0,
        spreadDistance: 0,
        color: 'red',
        inset: false,
      },
    ])
  })

  it('returns [] for undefined', () => {
    expect(resolveBoxShadowInput(undefined)).toEqual([])
  })
})

describe('pairBoxShadowLayers', () => {
  it('pads the shorter side with an invisible layer, CSS-transition style', () => {
    const from = parseBoxShadow('0 1px 2px rgba(0,0,0,0.3)')
    const to = parseBoxShadow(
      '0 1px 2px rgba(0,0,0,0.3), 0 2px 6px 2px rgba(0,0,0,0.15)',
    )
    const pairs = pairBoxShadowLayers(from, to)
    expect(pairs).toHaveLength(2)
    expect(pairs[1]!.from).toEqual({
      offsetX: 0,
      offsetY: 0,
      blurRadius: 0,
      spreadDistance: 0,
      color: 'transparent',
      inset: false,
    })
  })

  it('matches the padding layer inset-ness to its counterpart', () => {
    const pairs = pairBoxShadowLayers(
      [],
      parseBoxShadow('inset 0 2px 4px black'),
    )
    expect(pairs[0]!.from.inset).toBe(true)
  })

  it('throws on a genuine inset mismatch', () => {
    expect(() =>
      pairBoxShadowLayers(
        parseBoxShadow('0 2px 4px black'),
        parseBoxShadow('inset 0 2px 4px black'),
      ),
    ).toThrow(/inset cannot be interpolated/)
  })
})
