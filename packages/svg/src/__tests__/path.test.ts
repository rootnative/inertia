import {
  diffTemplate,
  flattenParams,
  parsePathD,
  serializePath,
  templateOf,
} from '../path'

describe('parsePathD', () => {
  it('parses a simple Move + Line + Close path', () => {
    const out = parsePathD('M 10 20 L 30 40 Z')
    expect(out).toEqual([
      { cmd: 'M', args: [10, 20] },
      { cmd: 'L', args: [30, 40] },
      { cmd: 'Z', args: [] },
    ])
  })

  it('expands implicit-repeat after M into Ls', () => {
    // Per the SVG spec, additional pairs after `M` are implicit `L`s.
    const out = parsePathD('M 0 0 10 10 20 20')
    expect(out).toEqual([
      { cmd: 'M', args: [0, 0] },
      { cmd: 'L', args: [10, 10] },
      { cmd: 'L', args: [20, 20] },
    ])
  })

  it('expands implicit-repeat for lowercase m into ls', () => {
    const out = parsePathD('m 0 0 5 5 5 5')
    expect(out).toEqual([
      { cmd: 'm', args: [0, 0] },
      { cmd: 'l', args: [5, 5] },
      { cmd: 'l', args: [5, 5] },
    ])
  })

  it('repeats non-M commands as themselves', () => {
    const out = parsePathD('L 1 1 2 2 3 3')
    expect(out).toEqual([
      { cmd: 'L', args: [1, 1] },
      { cmd: 'L', args: [2, 2] },
      { cmd: 'L', args: [3, 3] },
    ])
  })

  it('handles compact signed numbers without separators', () => {
    // `M0 0L100-50` is a real-world output from path generators.
    const out = parsePathD('M0 0L100-50')
    expect(out).toEqual([
      { cmd: 'M', args: [0, 0] },
      { cmd: 'L', args: [100, -50] },
    ])
  })

  it('handles compact decimal numbers like .5.6', () => {
    const out = parsePathD('M.5.6L1.5 2.25')
    expect(out).toEqual([
      { cmd: 'M', args: [0.5, 0.6] },
      { cmd: 'L', args: [1.5, 2.25] },
    ])
  })

  it('accepts scientific notation', () => {
    const out = parsePathD('M 1e2 -1.5e-1 L 0 0')
    expect(out).toEqual([
      { cmd: 'M', args: [100, -0.15] },
      { cmd: 'L', args: [0, 0] },
    ])
  })

  it('parses cubic curves with 6-arg batches', () => {
    const out = parsePathD('M 0 0 C 10 10 20 20 30 30 40 40 50 50 60 60')
    expect(out).toEqual([
      { cmd: 'M', args: [0, 0] },
      { cmd: 'C', args: [10, 10, 20, 20, 30, 30] },
      { cmd: 'C', args: [40, 40, 50, 50, 60, 60] },
    ])
  })

  it('rejects unknown command letters in dev', () => {
    expect(() => parsePathD('M 0 0 X 1 1')).toThrow(/unknown path command 'X'/)
  })

  it('rejects paths that start with a number', () => {
    expect(() => parsePathD('0 0 L 1 1')).toThrow(/expected command letter/)
  })
})

describe('templateOf + diffTemplate', () => {
  it('returns null when templates match', () => {
    const a = templateOf(parsePathD('M 0 0 L 10 10 Z'))
    const b = templateOf(parsePathD('M 20 20 L 50 50 Z'))
    expect(diffTemplate(a, b)).toBeNull()
  })

  it('flags differing command counts', () => {
    const a = templateOf(parsePathD('M 0 0 L 10 10'))
    const b = templateOf(parsePathD('M 0 0 L 10 10 L 20 20'))
    expect(diffTemplate(a, b)).toMatch(/command count differs/)
  })

  it('flags differing command letters', () => {
    const a = templateOf(parsePathD('M 0 0 L 10 10'))
    const b = templateOf(parsePathD('M 0 0 C 1 1 2 2 3 3'))
    expect(diffTemplate(a, b)).toMatch(/command at segment 1 differs/)
  })

  it('treats absolute and relative variants as distinct templates', () => {
    // L vs l render differently; a morph between them would silently move
    // the path's anchor frame mid-animation. We refuse.
    const a = templateOf(parsePathD('M 0 0 L 10 10'))
    const b = templateOf(parsePathD('M 0 0 l 10 10'))
    expect(diffTemplate(a, b)).toMatch(/segment 1 differs/)
  })
})

describe('flattenParams', () => {
  it('flattens segment args into a single number array', () => {
    const segs = parsePathD('M 1 2 L 3 4 C 5 6 7 8 9 10 Z')
    expect(flattenParams(segs)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
  })

  it('skips zero-arg segments', () => {
    const segs = parsePathD('M 0 0 Z')
    expect(flattenParams(segs)).toEqual([0, 0])
  })
})

describe('serializePath', () => {
  it('round-trips a parsed path back to a stable string', () => {
    const segs = parsePathD('M 1 2 L 3 4 Z')
    const t = templateOf(segs)
    const out = serializePath(t, flattenParams(segs))
    // Whitespace is normalized (single space between every token).
    expect(out).toBe('M 1 2L 3 4Z')
  })

  it('inserts interpolated params at the right positions', () => {
    const segs = parsePathD('M 0 0 L 10 10')
    const t = templateOf(segs)
    // Pretend we're mid-morph at 50% between (0,0)→(0,0) and (10,10)→(20,20).
    expect(serializePath(t, [0, 0, 15, 15])).toBe('M 0 0L 15 15')
  })
})
