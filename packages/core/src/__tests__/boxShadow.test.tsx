import * as Reanimated from 'react-native-reanimated'
import { MotionConfig } from '../config'
import { __resetWarnOnceForTests } from '../internal/warnOnce'
import { Motion } from '../motion'
import { renderWithMotion } from '../testing'

// `boxShadow` is the first *structured* animatable key — its shared value holds
// an array of layer objects rather than a scalar. That shape is load-bearing:
// Reanimated dispatches on the runtime shape of the target value, and a CSS
// box-shadow string would land in its prefix-number-suffix branch (built for
// values like '100%') and pull a single number out of a four-value shadow. The
// array form instead recurses into each layer and animates every leaf. These
// tests pin the JS-thread normalization that makes that work.

function getStyle(
  node: { props: { style?: unknown } } | null,
): Record<string, unknown> {
  if (!node) return {}
  const raw = node.props.style
  const flat = Array.isArray(raw) ? raw.flat(Infinity) : [raw]
  return Object.assign({}, ...flat.filter(Boolean))
}

function layers(
  node: { props: { style?: unknown } } | null,
): Array<Record<string, unknown>> {
  return (getStyle(node).boxShadow ?? []) as Array<Record<string, unknown>>
}

describe('boxShadow — target normalization', () => {
  beforeEach(() => {
    jest.restoreAllMocks()
    __resetWarnOnceForTests()
  })

  it('parses a CSS string target into structured layers, not a raw string', () => {
    const withTiming = jest.spyOn(Reanimated, 'withTiming')

    renderWithMotion(
      <Motion.View
        testID="card"
        animate={{ boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.3)' }}
        transition={{ type: 'timing' }}
      />,
    )

    const [target] = withTiming.mock.calls.at(-1)!
    // The whole point: never a string.
    expect(typeof target).not.toBe('string')
    expect(target).toEqual([
      {
        offsetX: 0,
        offsetY: 4,
        blurRadius: 8,
        spreadDistance: 0,
        color: 'rgba(0, 0, 0, 0.3)',
      },
    ])
  })

  it('renders the settled layers into the animated style', () => {
    const result = renderWithMotion(
      <Motion.View
        testID="card"
        animate={{ boxShadow: '0px 2px 4px #000' }}
        transition={{ type: 'timing' }}
      />,
    )

    expect(layers(result.toJSON() as never)).toEqual([
      {
        offsetX: 0,
        offsetY: 2,
        blurRadius: 4,
        spreadDistance: 0,
        color: '#000',
      },
    ])
  })

  it('accepts the structured array form, coercing px-string lengths', () => {
    const result = renderWithMotion(
      <Motion.View
        testID="card"
        animate={{
          boxShadow: [{ offsetX: '1px', offsetY: 2, blurRadius: 3 }],
        }}
      />,
    )

    expect(layers(result.toJSON() as never)).toEqual([
      {
        offsetX: 1,
        offsetY: 2,
        blurRadius: 3,
        spreadDistance: 0,
        color: 'black',
      },
    ])
  })

  it('animates a multi-layer shadow', () => {
    const result = renderWithMotion(
      <Motion.View
        testID="card"
        animate={{ boxShadow: '0px 1px 2px #111, 0px 2px 6px 1px #222' }}
      />,
    )

    expect(layers(result.toJSON() as never)).toHaveLength(2)
    expect(layers(result.toJSON() as never)[1]).toMatchObject({
      offsetY: 2,
      blurRadius: 6,
      spreadDistance: 1,
      color: '#222',
    })
  })

  it("treats 'none' as zero layers", () => {
    const result = renderWithMotion(
      <Motion.View testID="card" animate={{ boxShadow: 'none' }} />,
    )
    expect(layers(result.toJSON() as never)).toEqual([])
  })
})

describe('boxShadow — endpoint padding', () => {
  beforeEach(() => {
    jest.restoreAllMocks()
    __resetWarnOnceForTests()
  })

  // Reanimated's `arrayOnStart` walks the CURRENT value's indices and reads
  // `toValue[i]` for each. Without padding, growing the layer count leaves the
  // new layers unanimated and shrinking it strands leaves at `toValue:
  // undefined` — so both endpoints must be padded to a common length on the JS
  // thread before the animation starts.
  it('pads the target up when the seed has more layers', () => {
    const withTiming = jest.spyOn(Reanimated, 'withTiming')

    renderWithMotion(
      <Motion.View
        testID="card"
        initial={{ boxShadow: '0px 1px 1px #111, 0px 2px 2px #222' }}
        animate={{ boxShadow: '0px 3px 3px #333' }}
        transition={{ type: 'timing' }}
      />,
    )

    const [target] = withTiming.mock.calls.at(-1)!
    expect(target).toHaveLength(2)
    // The absent second layer becomes an invisible one, so the surplus layer
    // fades out rather than popping.
    expect((target as unknown as Array<Record<string, unknown>>)[1]).toEqual({
      offsetX: 0,
      offsetY: 0,
      blurRadius: 0,
      spreadDistance: 0,
      color: 'transparent',
    })
  })

  it('pads the seed up when the target has more layers', () => {
    const result = renderWithMotion(
      <Motion.View
        testID="card"
        initial={{ boxShadow: '0px 1px 1px #111' }}
        animate={{ boxShadow: '0px 1px 1px #111, 0px 2px 2px #222' }}
        transition={{ type: 'timing' }}
      />,
    )

    // Both layers arrive; the second one existed as a transparent placeholder
    // for the duration of the animation.
    expect(layers(result.toJSON() as never)).toHaveLength(2)
    expect(layers(result.toJSON() as never)[1]).toMatchObject({
      offsetY: 2,
      color: '#222',
    })
  })

  it('grows from the empty resting seed when nothing set a source', () => {
    const withTiming = jest.spyOn(Reanimated, 'withTiming')

    renderWithMotion(
      <Motion.View
        testID="card"
        initial={false}
        animate={{ boxShadow: '0px 4px 8px #000' }}
        transition={{ type: 'timing' }}
      />,
    )

    const [target] = withTiming.mock.calls.at(-1)!
    expect(target).toHaveLength(1)
  })

  it('throws when a paired layer is inset on only one side', () => {
    // Not interpolable: there is no meaningful midpoint between an inner and
    // an outer shadow.
    expect(() =>
      renderWithMotion(
        <Motion.View
          testID="card"
          initial={{ boxShadow: 'inset 0px 1px 1px #111' }}
          animate={{ boxShadow: '0px 1px 1px #111' }}
        />,
      ),
    ).toThrow(/inset cannot be interpolated/)
  })

  it('rejects a length in an unsupported unit', () => {
    expect(() =>
      renderWithMotion(
        <Motion.View testID="card" animate={{ boxShadow: '0 1em 2px #000' }} />,
      ),
    ).toThrow(/unsupported unit/)
  })
})

describe('boxShadow — inset', () => {
  beforeEach(() => {
    jest.restoreAllMocks()
    __resetWarnOnceForTests()
  })

  // `inset` is deliberately kept out of the animated payload: Reanimated would
  // drive the boolean down its numeric path, and `false + (false - false) * p`
  // is `0` — a number handed to native where a boolean belongs.
  it('never sends inset through the animation driver', () => {
    const withTiming = jest.spyOn(Reanimated, 'withTiming')

    renderWithMotion(
      <Motion.View
        testID="card"
        animate={{ boxShadow: 'inset 0px 1px 2px #000' }}
        transition={{ type: 'timing' }}
      />,
    )

    const [target] = withTiming.mock.calls.at(-1)!
    expect(
      (target as unknown as Array<Record<string, unknown>>)[0],
    ).not.toHaveProperty('inset')
  })

  it('reattaches inset to the emitted style', () => {
    const result = renderWithMotion(
      <Motion.View
        testID="card"
        animate={{ boxShadow: 'inset 0px 1px 2px #000' }}
      />,
    )

    expect(layers(result.toJSON() as never)[0]).toMatchObject({
      offsetY: 1,
      inset: true,
    })
  })

  it('omits inset entirely when no layer is inset', () => {
    const result = renderWithMotion(
      <Motion.View testID="card" animate={{ boxShadow: '0px 1px 2px #000' }} />,
    )

    expect(layers(result.toJSON() as never)[0]).not.toHaveProperty('inset')
  })

  it('tracks inset per layer in a mixed shadow', () => {
    const result = renderWithMotion(
      <Motion.View
        testID="card"
        animate={{ boxShadow: '0px 1px 2px #111, inset 0px 2px 3px #222' }}
      />,
    )

    // Once any layer is inset the flag is emitted for all of them, so the
    // outer layer says `inset: false` rather than omitting the key.
    const emitted = layers(result.toJSON() as never)
    expect(emitted[0]).toMatchObject({ inset: false })
    expect(emitted[1]).toMatchObject({ inset: true })
  })
})

describe('boxShadow — integration with the rest of the surface', () => {
  beforeEach(() => {
    jest.restoreAllMocks()
    __resetWarnOnceForTests()
  })

  it('honours a per-property transition', () => {
    const withTiming = jest.spyOn(Reanimated, 'withTiming')
    const withSpring = jest.spyOn(Reanimated, 'withSpring')

    renderWithMotion(
      <Motion.View
        testID="card"
        animate={{ opacity: 1, boxShadow: '0px 4px 8px #000' }}
        transition={{
          opacity: { type: 'spring' },
          boxShadow: { type: 'timing', duration: 120 },
        }}
      />,
    )

    expect(withTiming).toHaveBeenCalledWith(
      expect.any(Array),
      expect.objectContaining({ duration: 120 }),
      undefined,
    )
    expect(withSpring).toHaveBeenCalledWith(1, expect.any(Object), undefined)
  })

  it('snaps to the target under reduced motion', () => {
    const withTiming = jest.spyOn(Reanimated, 'withTiming')
    const withSpring = jest.spyOn(Reanimated, 'withSpring')

    renderWithMotion(
      <MotionConfig reducedMotion="always">
        <Motion.View
          testID="card"
          initial={{ boxShadow: 'none' }}
          animate={{ boxShadow: '0px 4px 8px #000' }}
        />
      </MotionConfig>,
    )

    // The contract is "no interpolation" — `no-animation` assigns the target
    // straight to the slot. The assignment itself isn't observable here: the
    // `useAnimatedStyle` stub runs during render, before the driving effect,
    // and a shared-value write doesn't re-render. Same limit the other
    // reduced-motion tests work within.
    expect(withTiming).not.toHaveBeenCalled()
    expect(withSpring).not.toHaveBeenCalled()
  })

  it('resolves through a variant', () => {
    const variants = {
      flat: { boxShadow: 'none' },
      raised: { boxShadow: '0px 6px 12px #000' },
    }

    const result = renderWithMotion(
      <Motion.View testID="card" variants={variants} animate="raised" />,
    )

    expect(layers(result.toJSON() as never)[0]).toMatchObject({ offsetY: 6 })
  })

  it('rests at the static style value when only a variant mentions it', () => {
    // The 0.0.3 P0 class: a key declared solely in a non-active branch must
    // rest at whatever `style` says, not at the type default — the animated
    // style merges after `style` and would otherwise erase it.
    const style = { boxShadow: '0px 1px 1px #abc' } as never

    const result = renderWithMotion(
      <Motion.View
        testID="card"
        style={style}
        variants={{
          flat: { opacity: 1 },
          raised: { boxShadow: '0px 6px 12px #000' },
        }}
        animate="flat"
      />,
    )

    expect(layers(result.toJSON() as never)[0]).toMatchObject({
      offsetY: 1,
      color: '#abc',
    })
  })

  it('warns and ignores boxShadow inside a gesture sub-state', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})

    renderWithMotion(
      <Motion.View
        testID="card"
        animate={{ boxShadow: '0px 1px 2px #000' }}
        gesture={{ pressed: { boxShadow: '0px 8px 16px #000' } }}
      />,
    )

    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('not supported inside `gesture.pressed`'),
    )
  })

  it('warns when boxShadow is animated alongside the native shadow* keys', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})

    renderWithMotion(
      <Motion.View
        testID="card"
        animate={{ boxShadow: '0px 1px 2px #000', shadowOpacity: 0.4 }}
      />,
    )

    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('two shadow systems'),
    )
  })

  it('does not warn for boxShadow on its own', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})

    renderWithMotion(
      <Motion.View testID="card" animate={{ boxShadow: '0px 1px 2px #000' }} />,
    )

    expect(warn).not.toHaveBeenCalled()
  })

  it('leaves the slot untouched when no record mentions boxShadow', () => {
    const result = renderWithMotion(
      <Motion.View testID="card" animate={{ opacity: 0.5 }} />,
    )

    expect(getStyle(result.toJSON() as never)).not.toHaveProperty('boxShadow')
  })
})
