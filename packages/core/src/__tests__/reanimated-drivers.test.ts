// The one test file that drives REAL Reanimated.
//
// Everywhere else the suite runs against the static mock in `jest-setup.js`,
// where `withSpring` / `withTiming` are the identity function. That mock is
// right for asserting what Inertia *resolves* — but it means no other test in
// this repo can observe whether Reanimated can actually animate the value we
// hand it. Two shipped defects lived in exactly that gap:
//
//   - `0.0.4`–`0.0.5`: `animate={{ boxShadow }}` was dead under `type: 'spring'`
//     (the library default) because the payload was an array. All 22 tests in
//     `boxShadow.test.tsx` used `type: 'timing'`, and all of them passed.
//   - The colour keys' resting default was `'transparent'`, the one colour name
//     Reanimated's `isColor` rejects, so animating away from it produced
//     `'transparentNaN'` and never settled.
//
// Both are invisible to a mock and both are caught below, by running
// Reanimated's own `onStart` / `onFrame` protocol — the same one its
// `valueSetter` runs when a shared value is assigned an animation.
//
// These assertions describe REANIMATED's behaviour, not Inertia's. If one
// fails after a Reanimated upgrade, the assumption behind a workaround has
// changed: read the failure as "check whether the workaround is still needed",
// not as "Inertia broke".

import {
  layersToPayload,
  parseBoxShadow,
  prepareBoxShadowAnimation,
} from '../internal/boxShadow'
import { TRANSPARENT } from '../internal/color'

// Reanimated's own modules import the worklets runtime directly. The global
// mock in `jest-setup.js` stubs only `isWorkletFunction`, which is all the
// Inertia source needs; the real drivers touch more of the surface.
jest.mock('react-native-worklets', () => {
  const cache = new Map()
  return {
    __esModule: true,
    isWorkletFunction: () => false,
    createSerializable: (value: unknown) => value,
    serializableMappingCache: {
      set: (key: unknown, value: unknown) => cache.set(key, value),
      get: (key: unknown) => cache.get(key),
    },
    runOnUI: (fn: unknown) => fn,
    runOnJS: (fn: unknown) => fn,
    RuntimeKind: { ReactNative: 1, UI: 2, Worker: 3 },
  }
})

/* eslint-disable @typescript-eslint/no-explicit-any */
const { withSpring } =
  require('react-native-reanimated/lib/module/animation/spring/spring') as any
const { withTiming } =
  require('react-native-reanimated/lib/module/animation/timing') as any
/* eslint-enable @typescript-eslint/no-explicit-any */

const SPRING = { stiffness: 100, damping: 12, mass: 1 }
const FRAME_MS = 16
// Long enough for any settling spring; a spring that hasn't converged in ~16s
// of frames is not converging.
const MAX_FRAMES = 1000

/**
 * Run an animation the way Reanimated's `valueSetter` does: `onStart` with the
 * current value, then `onFrame` until it reports finished.
 *
 * Returns `settled: false` when the frame budget runs out — which is the exact
 * shape the `boxShadow` defect took on device. `withSpring` decides it has
 * settled by comparing against `NaN`, so a poisoned leaf loops forever.
 */
function run(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  animation: any,
  from: unknown,
): { settled: boolean; frames: number; value: unknown } {
  animation.onStart(animation, from, 0, undefined)
  for (let frame = 1; frame <= MAX_FRAMES; frame++) {
    if (animation.onFrame(animation, frame * FRAME_MS)) {
      return { settled: true, frames: frame, value: animation.current }
    }
  }
  return { settled: false, frames: MAX_FRAMES, value: animation.current }
}

describe('Reanimated drivers — structured values', () => {
  // `prepareBoxShadowAnimation` + `layersToPayload` is precisely what
  // `driveBoxShadow` feeds to the driver, so this is the real payload.
  function payloadsFor(fromCss: string, toCss: string) {
    const { from, to } = prepareBoxShadowAnimation(
      {
        layers: parseBoxShadow(fromCss).map(({ inset: _i, ...l }) => l),
        insets: null,
      },
      toCss,
    )
    return { from: layersToPayload(from), to: layersToPayload(to) }
  }

  it('settles every leaf of a boxShadow payload under withSpring', () => {
    const { from, to } = payloadsFor(
      '0px 1px 2px rgba(0, 0, 0, 0.3)',
      '0px 8px 16px rgba(0, 0, 0, 0.4)',
    )

    const result = run(withSpring(to, SPRING), from)

    // The whole defect in one assertion: under the array payload this was
    // false, forever.
    expect(result.settled).toBe(true)
    const layer = (result.value as Record<string, Record<string, unknown>>)[0]!
    expect(layer.offsetY).toBeCloseTo(8)
    expect(layer.blurRadius).toBeCloseTo(16)
    // The colour leaf is the one an array payload could never reach: array
    // elements are handed to the scalar maths rather than re-dispatched.
    expect(layer.color).toMatch(/^rgba\(/)
  })

  it('settles a padded layer-count mismatch under withSpring', () => {
    // 1 layer → 2. The padding layer is transparent, and it has to be a colour
    // Reanimated accepts or this single leaf hangs the whole animation.
    const { from, to } = payloadsFor(
      '0px 1px 2px rgba(0, 0, 0, 0.3)',
      '0px 8px 16px rgba(0, 0, 0, 0.4), 0px 2px 4px rgba(0, 0, 0, 0.2)',
    )

    const result = run(withSpring(to, SPRING), from)

    expect(result.settled).toBe(true)
    const layers = result.value as Record<string, Record<string, unknown>>
    expect(layers[1]!.offsetY).toBeCloseTo(2)
    expect(layers[1]!.color).toMatch(/^rgba\(/)
  })

  it('mid-flight frames carry numbers, never NaN or a stringified object', () => {
    const { from, to } = payloadsFor(
      '0px 1px 2px rgba(0, 0, 0, 0.3)',
      '0px 8px 16px rgba(0, 0, 0, 0.4)',
    )
    const animation = withSpring(to, SPRING)
    animation.onStart(animation, from, 0, undefined)
    animation.onFrame(animation, FRAME_MS * 5)

    const layer = (
      animation.current as Record<string, Record<string, unknown>>
    )[0]!
    expect(typeof layer.offsetY).toBe('number')
    expect(Number.isNaN(layer.offsetY)).toBe(false)
    // The array payload's signature failure — `[object Object]NaN`.
    expect(String(layer.color)).not.toContain('NaN')
  })

  // Characterization, not a requirement: this documents why the payload is
  // keyed by index. `objectOnStart` re-assigns the decorated `onStart` to each
  // child so nested structures recurse; `arrayOnStart` does not. If Reanimated
  // ever makes the two symmetrical this test fails, and the index-keying in
  // `internal/boxShadow.ts` can be reconsidered.
  it('does not recurse into arrays, which is why the payload is an object', () => {
    const { from, to } = payloadsFor(
      '0px 1px 2px rgba(0, 0, 0, 0.3)',
      '0px 8px 16px rgba(0, 0, 0, 0.4)',
    )
    const asArray = (payload: Record<string, unknown>) => [payload[0]]

    const result = run(withSpring(asArray(to), SPRING), asArray(from))

    expect(result.settled).toBe(false)
  })
})

describe('Reanimated drivers — colour sources', () => {
  it("cannot animate away from the CSS keyword 'transparent'", () => {
    // Reanimated's colour-name table maps `transparent` to `undefined`, so
    // `isColor` rejects it and the value takes the prefix-number-suffix branch.
    const result = run(withSpring('#ff0000', SPRING), 'transparent')

    expect(result.settled).toBe(false)
    expect(String(result.value)).toContain('NaN')
  })

  it('animates away from the rgba spelling Inertia rests colours at', () => {
    const result = run(withSpring('#ff0000', SPRING), TRANSPARENT)

    expect(result.settled).toBe(true)
    expect(result.value).toBe('rgba(255, 0, 0, 1)')
  })

  it('hides the keyword failure under withTiming, which is how it shipped', () => {
    // Timing snaps to its target once the duration elapses, whatever the
    // interpolation produced along the way. That is why `type: 'timing'` looked
    // correct on device while spring was dead — and why testing a feature only
    // under its non-default transition proves so little.
    const timing = run(withTiming('#ff0000', { duration: 300 }), 'transparent')
    expect(timing.settled).toBe(true)

    const spring = run(withSpring('#ff0000', SPRING), 'transparent')
    expect(spring.settled).toBe(false)
  })
})
