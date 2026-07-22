import { render } from '@testing-library/react-native'
import * as Reanimated from 'react-native-reanimated'
import type { SharedValue } from 'react-native-reanimated'
import {
  useInterpolatedStyle,
  useMotionValue,
  type InterpolatedStyleMap,
  type UseInterpolatedStyleOptions,
} from '../values'

// `useInterpolatedStyle` maps one progress SharedValue onto N style/transform
// props via `interpolate` / `interpolateColor`. The static Reanimated mock
// resolves `interpolate`/`interpolateColor` to the last output stop when the
// driver is >= 1 and the first otherwise, and `useAnimatedStyle` runs the
// worklet once and returns its object — so driving `progress.value` to 0 or 1
// lets us assert the endpoint style the hook emits. Frame-level curves aren't
// observable here; these guard the wiring (key routing, transform lifting,
// deg strings, color routing).

type Probe = { current?: Record<string, unknown> }

function readStyle(
  map: InterpolatedStyleMap,
  driveTo: number,
  options?: UseInterpolatedStyleOptions,
): Record<string, unknown> {
  const probe: Probe = {}
  function Setup() {
    const progress: SharedValue<number> = useMotionValue(0)
    progress.value = driveTo
    probe.current = useInterpolatedStyle(progress, map, options) as never
    return null
  }
  render(<Setup />)
  return probe.current!
}

beforeEach(() => {
  jest.restoreAllMocks()
})

describe('useInterpolatedStyle — numeric keys', () => {
  it('emits a plain numeric style key at both endpoints', () => {
    // driver 1 → last output stop
    expect(readStyle({ height: [100, 40] }, 1).height).toBe(40)
    // driver 0 → first output stop
    expect(readStyle({ height: [100, 40] }, 0).height).toBe(100)
  })

  it('routes numeric interpolation through interpolate, not interpolateColor', () => {
    const interpolate = jest.spyOn(Reanimated, 'interpolate')
    const interpolateColor = jest.spyOn(Reanimated, 'interpolateColor')
    readStyle({ opacity: [0, 1] }, 1)
    expect(interpolate).toHaveBeenCalled()
    expect(interpolateColor).not.toHaveBeenCalled()
  })

  it('emits multiple numeric keys from one progress value', () => {
    const style = readStyle({ height: [100, 40], fontSize: [24, 16] }, 1)
    expect(style.height).toBe(40)
    expect(style.fontSize).toBe(16)
  })
})

describe('useInterpolatedStyle — color keys', () => {
  it('routes color-string stops through interpolateColor', () => {
    const interpolateColor = jest.spyOn(Reanimated, 'interpolateColor')
    const style = readStyle({ borderColor: ['#ffffff', '#000000'] }, 1)
    expect(interpolateColor).toHaveBeenCalled()
    expect(style.borderColor).toBe('#000000')
  })

  it('interleaves color and numeric keys correctly', () => {
    const style = readStyle(
      { opacity: [0, 1], backgroundColor: ['#fff', '#111'] },
      1,
    )
    expect(style.opacity).toBe(1)
    expect(style.backgroundColor).toBe('#111')
  })
})

describe('useInterpolatedStyle — transform lifting', () => {
  it('lifts transform keys into a transform array in map key order', () => {
    const style = readStyle({ translateY: [20, 0], scale: [0.8, 1] }, 1)
    expect(style.transform).toEqual([{ translateY: 0 }, { scale: 1 }])
    // Transform keys must NOT leak as top-level style keys.
    expect(style.translateY).toBeUndefined()
    expect(style.scale).toBeUndefined()
  })

  it('preserves author key order in the transform array', () => {
    const style = readStyle({ scale: [0.8, 1], translateX: [10, 0] }, 1)
    expect(style.transform).toEqual([{ scale: 1 }, { translateX: 0 }])
  })

  it('emits rotate keys as deg strings', () => {
    const style = readStyle({ rotate: [0, 90] }, 1)
    expect(style.transform).toEqual([{ rotate: '90deg' }])
  })

  it('omits the transform array entirely when no transform keys are present', () => {
    const style = readStyle({ opacity: [0, 1] }, 1)
    expect(style).not.toHaveProperty('transform')
  })

  it('mixes plain, color, and transform keys in one call', () => {
    const style = readStyle(
      {
        height: [100, 40],
        backgroundColor: ['#fff', '#000'],
        translateY: [20, 0],
      },
      1,
    )
    expect(style.height).toBe(40)
    expect(style.backgroundColor).toBe('#000')
    expect(style.transform).toEqual([{ translateY: 0 }])
  })
})

describe('useInterpolatedStyle — memoization', () => {
  // The resolved per-key plan is memoized on an order-preserving signature, so
  // a fresh-but-structurally-equal map literal each render must NOT re-run the
  // JS-thread resolution — which is what keeps Reanimated from rebuilding the
  // UI-thread worklet on an unchanged map. The static mock discards the
  // worklet closure (`useAnimatedStyle: (fn) => fn()`), so we observe the
  // resolution step directly: `buildEntries` warns exactly once per run when
  // the map carries a length mismatch. Memoized ⇒ one warn across N renders;
  // un-memoized ⇒ one warn per render.
  it('resolves the map once across equal-but-fresh renders (no re-resolution)', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})
    function Setup() {
      const progress: SharedValue<number> = useMotionValue(0)
      // Fresh literal each render, deliberately mismatched to trip the warn.
      useInterpolatedStyle(
        progress,
        { opacity: [0, 1] },
        { inputRange: [0, 0.5, 1] },
      )
      return null
    }
    const { rerender } = render(<Setup />)
    rerender(<Setup />)
    rerender(<Setup />)
    // One resolution total, not one per render.
    expect(warn).toHaveBeenCalledTimes(1)
  })

  it('re-resolves when a value in the map actually changes', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})
    function Setup({ ir }: { ir: readonly number[] }) {
      const progress: SharedValue<number> = useMotionValue(0)
      useInterpolatedStyle(progress, { opacity: [0, 1] }, { inputRange: ir })
      return null
    }
    const { rerender } = render(<Setup ir={[0, 0.5, 1]} />)
    // Changed options → new sig → resolves again (and warns again).
    rerender(<Setup ir={[0, 0.25, 0.75, 1]} />)
    expect(warn).toHaveBeenCalledTimes(2)
  })
})

describe('useInterpolatedStyle — options', () => {
  it('accepts a custom inputRange for a multi-stop output', () => {
    // The mock ignores the input range and returns the last stop for driver
    // >= 1; we assert the multi-stop output threads through without throwing
    // and lands on the final stop.
    const style = readStyle({ opacity: [0, 1, 1, 0] }, 1, {
      inputRange: [0, 0.2, 0.8, 1],
    })
    expect(style.opacity).toBe(0)
  })

  it('warns in dev when inputRange length does not match an output length', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})
    readStyle({ opacity: [0, 1] }, 1, { inputRange: [0, 0.5, 1] })
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('inputRange has 3 stops'),
    )
  })
})
