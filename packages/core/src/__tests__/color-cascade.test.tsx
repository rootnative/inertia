import { render } from '@testing-library/react-native'
import * as Reanimated from 'react-native-reanimated'
import { interpolateColor, type SharedValue } from 'react-native-reanimated'
import {
  useColorCascade,
  useMotionValue,
  type ColorCascadeLayer,
  type UseColorCascadeOptions,
} from '../values'

// `useColorCascade` composites a priority-ordered chain of color layers over a
// base `rest` color, later layers winning as their progress rises. Under the
// static Reanimated mock `interpolateColor(v, [0,1], [a, b])` returns `b` when
// `v >= 1` and `a` otherwise — so driving each layer's progress to 0 or 1 lets
// us assert exactly which color the fold lands on. These guard the wiring
// (fold order, priority, key routing, layer counts) and prove parity against
// the equivalent hand-chained nested-`interpolateColor` shape.

type Probe = { current?: Record<string, unknown> }

// A layer spec that carries the progress *value* (0 or 1) we want to drive to,
// so the harness can allocate the shared values inside a component.
interface LayerSpec {
  drive: number
  color: string
}

function readCascade(
  rest: string,
  specs: readonly LayerSpec[],
  options?: UseColorCascadeOptions,
): Record<string, unknown> {
  const probe: Probe = {}
  function Setup() {
    // Allocate a fixed pool of shared values with unconditional top-level hook
    // calls (rules-of-hooks), then slice to the layer count this test needs.
    // Every test in this file uses at most three layers.
    const sv0: SharedValue<number> = useMotionValue(0)
    const sv1: SharedValue<number> = useMotionValue(0)
    const sv2: SharedValue<number> = useMotionValue(0)
    const pool = [sv0, sv1, sv2]
    const layers: ColorCascadeLayer[] = specs.map((s, i) => {
      const progress = pool[i]!
      progress.value = s.drive
      return { progress, color: s.color }
    })
    probe.current = useColorCascade(rest, layers, options) as never
    return null
  }
  render(<Setup />)
  return probe.current!
}

beforeEach(() => {
  jest.restoreAllMocks()
})

describe('useColorCascade — layer counts', () => {
  it('returns the rest color when a single layer is inactive', () => {
    const style = readCascade('#000000', [{ drive: 0, color: '#ff0000' }])
    expect(style.backgroundColor).toBe('#000000')
  })

  it('returns the layer color when a single layer is fully active', () => {
    const style = readCascade('#000000', [{ drive: 1, color: '#ff0000' }])
    expect(style.backgroundColor).toBe('#ff0000')
  })

  it('composites two layers (upper wins at full progress)', () => {
    const style = readCascade('#000000', [
      { drive: 1, color: '#ff0000' },
      { drive: 1, color: '#00ff00' },
    ])
    expect(style.backgroundColor).toBe('#00ff00')
  })

  it('composites three layers (topmost active wins)', () => {
    const style = readCascade('#000000', [
      { drive: 1, color: '#ff0000' },
      { drive: 1, color: '#00ff00' },
      { drive: 1, color: '#0000ff' },
    ])
    expect(style.backgroundColor).toBe('#0000ff')
  })
})

describe('useColorCascade — priority order', () => {
  it('a lower-priority active layer shows through when higher layers are inactive', () => {
    // Only the middle layer (index 1) is active — it wins over rest, and the
    // inactive top layer leaves the accumulated color untouched.
    const style = readCascade('#000000', [
      { drive: 0, color: '#ff0000' },
      { drive: 1, color: '#00ff00' },
      { drive: 0, color: '#0000ff' },
    ])
    expect(style.backgroundColor).toBe('#00ff00')
  })

  it('a higher-priority active layer overrides a lower active one', () => {
    // Both index 0 and index 2 active — the higher-index (later, higher
    // priority) layer wins.
    const style = readCascade('#000000', [
      { drive: 1, color: '#ff0000' },
      { drive: 0, color: '#00ff00' },
      { drive: 1, color: '#0000ff' },
    ])
    expect(style.backgroundColor).toBe('#0000ff')
  })

  it('all layers inactive falls back to rest', () => {
    const style = readCascade('#123456', [
      { drive: 0, color: '#ff0000' },
      { drive: 0, color: '#00ff00' },
    ])
    expect(style.backgroundColor).toBe('#123456')
  })
})

describe('useColorCascade — key option', () => {
  it('defaults to backgroundColor', () => {
    const style = readCascade('#000000', [{ drive: 1, color: '#abcdef' }])
    expect(Object.keys(style)).toEqual(['backgroundColor'])
    expect(style.backgroundColor).toBe('#abcdef')
  })

  it('routes the composited color into the configured key', () => {
    const style = readCascade('#000000', [{ drive: 1, color: '#abcdef' }], {
      key: 'borderColor',
    })
    expect(style.borderColor).toBe('#abcdef')
    expect(style.backgroundColor).toBeUndefined()
  })
})

describe('useColorCascade — clamping', () => {
  it('always passes the [0, 1] domain to interpolateColor', () => {
    const spy = jest.spyOn(Reanimated, 'interpolateColor')
    readCascade('#000000', [
      { drive: 1, color: '#ff0000' },
      { drive: 1, color: '#00ff00' },
    ])
    for (const call of spy.mock.calls) {
      expect(call[1]).toEqual([0, 1])
    }
  })
})

describe('useColorCascade — parity with a hand-chained interpolateColor fold', () => {
  it('matches focus(error(hover(rest))) for a representative mix of progresses', () => {
    // The exact shape the TextField border cascade hand-writes today.
    const rest = '#79747e'
    const layerColors = ['#49454f', '#b3261e', '#6750a4'] // hover, error, focus
    const drives = [1, 0, 1] // hover + focus active, error inactive

    // Hand-fold with the same mock-backed interpolateColor the hook uses.
    let expected = rest
    for (let i = 0; i < layerColors.length; i++) {
      expected = interpolateColor(
        drives[i]!,
        [0, 1],
        [expected, layerColors[i]!],
      )
    }

    const style = readCascade(
      rest,
      drives.map((drive, i) => ({ drive, color: layerColors[i]! })),
      { key: 'borderColor' },
    )
    expect(style.borderColor).toBe(expected)
  })
})

describe('useColorCascade — memoization', () => {
  // The resolved color/progress plan is memoized on a structural signature, so
  // a fresh-but-equal `layers` array each render must reuse the same plan
  // references — which is what keeps Reanimated from rebuilding the UI-thread
  // worklet. The static mock discards the worklet closure, so we instead
  // observe that the interpolateColor call shape is stable across renders and
  // the emitted color is unchanged when the inputs are equal.
  it('produces a stable result across equal-but-fresh renders', () => {
    const probe: Probe = {}
    function Setup() {
      const hover: SharedValue<number> = useMotionValue(1)
      const focus: SharedValue<number> = useMotionValue(0)
      // Fresh literal each render — same colors, same key.
      probe.current = useColorCascade(
        '#000000',
        [
          { progress: hover, color: '#111111' },
          { progress: focus, color: '#222222' },
        ],
        { key: 'borderColor' },
      ) as never
      return null
    }
    const { rerender } = render(<Setup />)
    const first = probe.current!.borderColor
    rerender(<Setup />)
    rerender(<Setup />)
    expect(probe.current!.borderColor).toBe(first)
    // hover (index 0) is at 1, focus (index 1) at 0 → hover color wins.
    expect(first).toBe('#111111')
  })
})
