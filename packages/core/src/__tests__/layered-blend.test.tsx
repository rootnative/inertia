import { fireEvent, render, screen } from '@testing-library/react-native'
import { cloneElement, type ReactElement } from 'react'
import * as Reanimated from 'react-native-reanimated'
import { Motion } from '../motion'
import { renderWithMotion } from '../testing'

// Phase-3 acceptance for the `@rootnative/ui` migration: gesture sub-states
// must layer additively, not select a single winner. Each declared sub-state
// owns an independent progress (0↔1) SV that fades in/out with its own
// transition; the worklet composites the layers in priority order
// (`hovered → focused → focusVisible → pressed`). MD3 state-layer visuals
// during overlapping transitions (release-while-still-hovered) require this
// model — a single-state-wins approach would jump the value between targets
// instead of fading the press layer out independently of the hover layer.

jest.mock('../gestures', () => ({
  isFocusVisible: jest.fn(() => true),
}))

beforeEach(() => {
  jest.restoreAllMocks()
})

function getStyle(
  node: { props: { style?: unknown } } | null,
): Record<string, unknown> {
  if (!node) return {}
  const raw = node.props.style
  const flat = Array.isArray(raw) ? raw.flat(Infinity) : [raw]
  return Object.assign({}, ...flat.filter(Boolean))
}

function flush(
  result: ReturnType<typeof renderWithMotion>,
  ui: ReactElement,
): void {
  result.rerender(cloneElement(ui))
}

describe('layered blend — composition', () => {
  it('a single active layer pulls the value to its target', () => {
    const ui = (
      <Motion.Pressable
        testID="card"
        initial={{ opacity: 1 }}
        animate={{ opacity: 1 }}
        gesture={{ pressed: { opacity: 0.4 } }}
        transition={{ type: 'timing', duration: 100 }}
      />
    )
    const result = renderWithMotion(ui)

    fireEvent(screen.getByTestId('card'), 'pressIn')
    flush(result, ui)

    expect(getStyle(result.toJSON() as never).opacity).toBeCloseTo(0.4)
  })

  it('two stacked layers compose (lower-priority lerps first, then upper)', () => {
    // hovered.opacity=0.7 then pressed.opacity=0.5. With both progresses at 1:
    //   v = lerp(1.0,  0.7, 1) = 0.7
    //   v = lerp(0.7, 0.5, 1) = 0.5
    // The press layer fully overrides at progress=1; the chain still records
    // the hover contribution for any mid-transition state.
    const ui = (
      <Motion.Pressable
        testID="card"
        initial={{ opacity: 1 }}
        animate={{ opacity: 1 }}
        gesture={{
          hovered: { opacity: 0.7 },
          pressed: { opacity: 0.5 },
        }}
        transition={{ type: 'timing', duration: 100 }}
      />
    )
    const result = renderWithMotion(ui)

    const node = screen.getByTestId('card')
    fireEvent(node, 'mouseEnter')
    fireEvent(node, 'pressIn')
    flush(result, ui)

    expect(getStyle(result.toJSON() as never).opacity).toBeCloseTo(0.5)
  })

  it('release-while-hovered: press fades out independently, hover layer stays', () => {
    // The MD3 acceptance case. After `pressOut` the press progress decays to 0
    // (synchronously under the Reanimated mock), but `hovered` is still active
    // → its progress stays at 1. The composed value collapses to the hover
    // target rather than snapping back to base.
    const ui = (
      <Motion.Pressable
        testID="card"
        initial={{ opacity: 1 }}
        animate={{ opacity: 1 }}
        gesture={{
          hovered: { opacity: 0.7 },
          pressed: { opacity: 0.5 },
        }}
        transition={{ type: 'timing', duration: 100 }}
      />
    )
    const result = renderWithMotion(ui)

    const node = screen.getByTestId('card')
    fireEvent(node, 'mouseEnter')
    fireEvent(node, 'pressIn')
    fireEvent(node, 'pressOut')
    flush(result, ui)

    // pressed → 0, hovered → 1. Composed: lerp(1, 0.7, 1) = 0.7, then nothing
    // from pressed (progress=0 short-circuits the chain). 0.7 — NOT 1.0
    // (which would mean "no layer active") and NOT 0.5 (the pressed target).
    expect(getStyle(result.toJSON() as never).opacity).toBeCloseTo(0.7)
  })

  it('color layers composite via interpolateColor', () => {
    // Reanimated's `interpolateColor` is what closes the loop here. With
    // hovered.bg='#ff0000' at progress 1 over a transparent base, the rendered
    // backgroundColor should match the target — the worklet path swaps in
    // `interpolateColor` for color keys instead of arithmetic lerp.
    const ui = (
      <Motion.View
        testID="card"
        initial={{ backgroundColor: 'transparent' }}
        animate={{ backgroundColor: 'transparent' }}
        gesture={{ hovered: { backgroundColor: '#ff0000' } }}
        transition={{ type: 'timing', duration: 100 }}
      />
    )
    const result = renderWithMotion(ui)

    fireEvent(screen.getByTestId('card'), 'mouseEnter')
    flush(result, ui)

    // `interpolateColor` returns a number-encoded RGBA at progress 1 that
    // equals the target color. Reanimated normalizes the encoding; we just
    // assert the slot is non-empty and not the resting transparent value.
    const bg = getStyle(result.toJSON() as never).backgroundColor
    expect(bg).toBeDefined()
    expect(bg).not.toBe('transparent')
  })

  it('inactive declared layer contributes nothing (progress stays at 0)', () => {
    // A declared but inactive sub-state must not pull the value off-target.
    // This guards the `progress > 0` short-circuit in the worklet.
    const ui = (
      <Motion.Pressable
        testID="card"
        initial={{ opacity: 1 }}
        animate={{ opacity: 1 }}
        gesture={{ pressed: { opacity: 0.1 } }}
        transition={{ type: 'timing', duration: 100 }}
      />
    )
    const result = renderWithMotion(ui)

    expect(getStyle(result.toJSON() as never).opacity).toBeCloseTo(1)
  })
})

describe('layered blend — per-layer transition wiring', () => {
  it("transition.<layer> drives that layer's progress animation", () => {
    const withTiming = jest.spyOn(Reanimated, 'withTiming')

    render(
      <Motion.Pressable
        testID="card"
        animate={{ opacity: 1 }}
        gesture={{ pressed: { opacity: 0.5 } }}
        transition={{
          opacity: { type: 'spring' },
          pressed: { type: 'timing', duration: 50 },
        }}
      />,
    )

    withTiming.mockClear()
    fireEvent(screen.getByTestId('card'), 'pressIn')

    // The press-layer transition is `timing/50`, so the progress SV update on
    // pressIn flows through `withTiming(1, { duration: 50 })`.
    const matchingCalls = withTiming.mock.calls.filter(
      (call) =>
        call[0] === 1 && (call[1] as { duration?: number })?.duration === 50,
    )
    expect(matchingCalls.length).toBeGreaterThan(0)
  })

  it('falls back to top-level transition when no per-layer transition is set', () => {
    const withTiming = jest.spyOn(Reanimated, 'withTiming')

    render(
      <Motion.Pressable
        testID="card"
        animate={{ opacity: 1 }}
        gesture={{ pressed: { opacity: 0.5 } }}
        transition={{ type: 'timing', duration: 80 }}
      />,
    )

    withTiming.mockClear()
    fireEvent(screen.getByTestId('card'), 'pressIn')

    // Top-level `timing/80` applies to every property AND every gesture layer.
    const matchingCalls = withTiming.mock.calls.filter(
      (call) =>
        call[0] === 1 && (call[1] as { duration?: number })?.duration === 80,
    )
    expect(matchingCalls.length).toBeGreaterThan(0)
  })

  it('falls back to library default spring when neither per-layer nor top-level config matches', () => {
    const withSpring = jest.spyOn(Reanimated, 'withSpring')

    render(
      <Motion.Pressable
        testID="card"
        animate={{ opacity: 1 }}
        gesture={{ pressed: { opacity: 0.5 } }}
        transition={{ opacity: { type: 'timing', duration: 80 } }}
      />,
    )

    withSpring.mockClear()
    fireEvent(screen.getByTestId('card'), 'pressIn')

    // Per-property `transition.opacity` doesn't apply to the layer fade; with
    // no `transition.pressed` either, the layer progress falls through to the
    // library default `withSpring`.
    const matchingCalls = withSpring.mock.calls.filter((call) => call[0] === 1)
    expect(matchingCalls.length).toBeGreaterThan(0)
  })
})

describe('layered blend — exit interaction', () => {
  it('does not allocate withTiming/withSpring calls for layers when no gesture is declared', () => {
    const withTiming = jest.spyOn(Reanimated, 'withTiming')
    const withSpring = jest.spyOn(Reanimated, 'withSpring')

    render(
      <Motion.View
        testID="card"
        animate={{ opacity: 1 }}
        transition={{ type: 'timing', duration: 100 }}
      />,
    )

    // The 4 layer-progress effects all short-circuit when `declared` is false;
    // only the base `opacity` animation should dispatch.
    expect(withTiming.mock.calls.length).toBe(1)
    expect(withSpring.mock.calls.length).toBe(0)
  })
})
