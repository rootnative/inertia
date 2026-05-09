import * as Reanimated from 'react-native-reanimated'
import { resolveTransition } from '../resolve'

// `resolveTransition` is a pure JS-thread function that produces baked
// `withSpring` / `withTiming` / `withDecay` / `withRepeat` calls. Spy on the
// Reanimated mock to verify the right function is called with the right args.
// The mock returns plain values; the spies capture the call signature.

beforeEach(() => {
  jest.restoreAllMocks()
})

describe('decay resolver', () => {
  it('forwards public config and callback through to withDecay', () => {
    const withDecay = jest.spyOn(Reanimated, 'withDecay')
    const cb = jest.fn()
    resolveTransition(
      { type: 'decay', velocity: 800, deceleration: 0.998, clamp: [0, 600] },
      0,
      cb,
    )
    expect(withDecay).toHaveBeenCalledTimes(1)
    expect(withDecay).toHaveBeenCalledWith(
      { velocity: 800, deceleration: 0.998, clamp: [0, 600] },
      cb,
    )
  })

  it('defaults velocity to 0 when omitted', () => {
    const withDecay = jest.spyOn(Reanimated, 'withDecay')
    resolveTransition({ type: 'decay' }, 0)
    expect(withDecay).toHaveBeenCalledWith(
      expect.objectContaining({ velocity: 0 }),
      undefined,
    )
  })

  it('ignores repeat (decay cannot repeat)', () => {
    const withDecay = jest.spyOn(Reanimated, 'withDecay')
    const withRepeat = jest.spyOn(Reanimated, 'withRepeat')
    // Cast: `repeat` is not in the public DecayTransition type, but the
    // resolver must defensively skip it if it leaks through.
    resolveTransition({ type: 'decay', velocity: 100, repeat: 3 } as never, 0)
    expect(withDecay).toHaveBeenCalledTimes(1)
    expect(withRepeat).not.toHaveBeenCalled()
  })
})

describe('spring resolver — react-spring → Reanimated vocabulary', () => {
  it('translates tension/friction/mass to stiffness/damping/mass', () => {
    const withSpring = jest.spyOn(Reanimated, 'withSpring')
    resolveTransition(
      { type: 'spring', tension: 200, friction: 30, mass: 2, velocity: 5 },
      100,
    )
    expect(withSpring).toHaveBeenCalledWith(
      100,
      expect.objectContaining({
        stiffness: 200,
        damping: 30,
        mass: 2,
        velocity: 5,
      }),
      undefined,
    )
    // Public vocabulary must not bleed into the raw config — keeps consumers
    // from depending on undocumented Reanimated names.
    const cfg = withSpring.mock.calls[0]![1] as Record<string, unknown>
    expect(cfg.tension).toBeUndefined()
    expect(cfg.friction).toBeUndefined()
  })

  it('uses default tension=170 / friction=26 / mass=1 when omitted', () => {
    const withSpring = jest.spyOn(Reanimated, 'withSpring')
    resolveTransition(undefined, 100) // undefined config falls back to spring
    expect(withSpring).toHaveBeenCalledWith(
      100,
      expect.objectContaining({ stiffness: 170, damping: 26, mass: 1 }),
      undefined,
    )
  })
})

describe('repeat config', () => {
  it('number → withRepeat(anim, count, true)', () => {
    const withRepeat = jest.spyOn(Reanimated, 'withRepeat')
    resolveTransition({ type: 'spring', repeat: 3 }, 100)
    expect(withRepeat).toHaveBeenCalledWith(expect.anything(), 3, true)
  })

  it("'infinite' → withRepeat(anim, -1, true)", () => {
    const withRepeat = jest.spyOn(Reanimated, 'withRepeat')
    resolveTransition({ type: 'spring', repeat: 'infinite' }, 100)
    expect(withRepeat).toHaveBeenCalledWith(expect.anything(), -1, true)
  })

  it('{ count, alternate: false } honors alternate flag', () => {
    const withRepeat = jest.spyOn(Reanimated, 'withRepeat')
    resolveTransition(
      { type: 'spring', repeat: { count: 3, alternate: false } },
      100,
    )
    expect(withRepeat).toHaveBeenCalledWith(expect.anything(), 3, false)
  })

  it("{ count: 'infinite' } maps to -1", () => {
    const withRepeat = jest.spyOn(Reanimated, 'withRepeat')
    resolveTransition({ type: 'spring', repeat: { count: 'infinite' } }, 100)
    expect(withRepeat).toHaveBeenCalledWith(expect.anything(), -1, true)
  })

  it('alternate defaults to true on object form', () => {
    const withRepeat = jest.spyOn(Reanimated, 'withRepeat')
    resolveTransition({ type: 'spring', repeat: { count: 2 } }, 100)
    expect(withRepeat).toHaveBeenCalledWith(expect.anything(), 2, true)
  })
})

describe('no-animation', () => {
  it('skips Reanimated entirely and fires the callback synchronously', () => {
    const withSpring = jest.spyOn(Reanimated, 'withSpring')
    const withTiming = jest.spyOn(Reanimated, 'withTiming')
    const cb = jest.fn()
    const result = resolveTransition({ type: 'no-animation' }, 42, cb)
    expect(result).toBe(42)
    expect(withSpring).not.toHaveBeenCalled()
    expect(withTiming).not.toHaveBeenCalled()
    expect(cb).toHaveBeenCalledWith(true, 42)
  })
})

describe('color passthrough', () => {
  // Reanimated 3+ recognizes color strings inside `withSpring` / `withTiming`
  // and interpolates between their packed RGBA representations on the UI
  // thread. The resolver's job is just to forward the string unchanged — no
  // hex parsing, no `interpolateColor`, no special branch. These tests guard
  // that contract so a future "helpful" cast back to `number` doesn't quietly
  // break color animations on every state-layer component.
  it('forwards a color string straight through withSpring', () => {
    const withSpring = jest.spyOn(Reanimated, 'withSpring')
    resolveTransition({ type: 'spring' }, '#ff0000')
    expect(withSpring).toHaveBeenCalledWith(
      '#ff0000',
      expect.any(Object),
      undefined,
    )
  })

  it('forwards a color string straight through withTiming', () => {
    const withTiming = jest.spyOn(Reanimated, 'withTiming')
    resolveTransition({ type: 'timing', duration: 200 }, 'rgba(79, 70, 229, 1)')
    expect(withTiming).toHaveBeenCalledWith(
      'rgba(79, 70, 229, 1)',
      expect.objectContaining({ duration: 200 }),
      undefined,
    )
  })

  it('no-animation returns the color string and fires the callback', () => {
    const cb = jest.fn()
    const result = resolveTransition({ type: 'no-animation' }, '#4f46e5', cb)
    expect(result).toBe('#4f46e5')
    expect(cb).toHaveBeenCalledWith(true, '#4f46e5')
  })
})
