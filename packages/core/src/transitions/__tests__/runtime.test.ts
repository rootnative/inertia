import * as Reanimated from 'react-native-reanimated'
import { buildReleaseAnimation } from '../runtime'

// `buildReleaseAnimation` mirrors a subset of `resolveTransition` and runs as
// a worklet. The Reanimated mock makes `withDecay` / `withSpring` / `withTiming`
// synchronous; we spy on each to verify the right call shape.

beforeEach(() => {
  jest.restoreAllMocks()
})

describe('buildReleaseAnimation', () => {
  it('forwards decay config to withDecay (ignoring toValue)', () => {
    const withDecay = jest.spyOn(Reanimated, 'withDecay')
    buildReleaseAnimation(
      { type: 'decay', velocity: 1200, deceleration: 0.997, clamp: [-50, 50] },
      0,
    )
    expect(withDecay).toHaveBeenCalledTimes(1)
    expect(withDecay).toHaveBeenCalledWith(
      {
        velocity: 1200,
        deceleration: 0.997,
        clamp: [-50, 50],
      },
      undefined,
    )
  })

  it('omits deceleration / clamp from the decay config when not provided', () => {
    const withDecay = jest.spyOn(Reanimated, 'withDecay')
    buildReleaseAnimation({ type: 'decay', velocity: 500 }, 0)
    expect(withDecay).toHaveBeenCalledWith({ velocity: 500 }, undefined)
  })

  it('translates react-spring vocabulary to Reanimated stiffness/damping', () => {
    const withSpring = jest.spyOn(Reanimated, 'withSpring')
    buildReleaseAnimation(
      { type: 'spring', tension: 200, friction: 30, mass: 2, velocity: 800 },
      100,
    )
    expect(withSpring).toHaveBeenCalledWith(
      100,
      expect.objectContaining({
        stiffness: 200,
        damping: 30,
        mass: 2,
        velocity: 800,
      }),
      undefined,
    )
  })

  it('uses default spring physics when omitted', () => {
    const withSpring = jest.spyOn(Reanimated, 'withSpring')
    buildReleaseAnimation({ type: 'spring' }, 50)
    expect(withSpring).toHaveBeenCalledWith(
      50,
      expect.objectContaining({ stiffness: 170, damping: 26, mass: 1 }),
      undefined,
    )
  })

  it('forwards timing duration and easing to withTiming', () => {
    const withTiming = jest.spyOn(Reanimated, 'withTiming')
    const easing = (t: number) => t
    buildReleaseAnimation({ type: 'timing', duration: 400, easing }, 200)
    expect(withTiming).toHaveBeenCalledWith(
      200,
      expect.objectContaining({ duration: 400, easing }),
      undefined,
    )
  })

  it('returns the toValue directly for no-animation (no Reanimated call)', () => {
    const withSpring = jest.spyOn(Reanimated, 'withSpring')
    const withTiming = jest.spyOn(Reanimated, 'withTiming')
    const withDecay = jest.spyOn(Reanimated, 'withDecay')
    const result = buildReleaseAnimation({ type: 'no-animation' }, 42)
    expect(result).toBe(42)
    expect(withSpring).not.toHaveBeenCalled()
    expect(withTiming).not.toHaveBeenCalled()
    expect(withDecay).not.toHaveBeenCalled()
  })

  it('forwards the settle callback to withSpring as the third argument', () => {
    const withSpring = jest.spyOn(Reanimated, 'withSpring')
    const callback = jest.fn()
    buildReleaseAnimation({ type: 'spring' }, 0, callback)
    expect(withSpring.mock.calls[0]![2]).toBe(callback)
    // Not invoked by the builder itself — Reanimated fires it on settle.
    expect(callback).not.toHaveBeenCalled()
  })

  it('forwards the settle callback to withTiming and withDecay', () => {
    const withTiming = jest.spyOn(Reanimated, 'withTiming')
    const withDecay = jest.spyOn(Reanimated, 'withDecay')
    const callback = jest.fn()
    buildReleaseAnimation({ type: 'timing', duration: 100 }, 0, callback)
    buildReleaseAnimation({ type: 'decay', velocity: 500 }, 0, callback)
    expect(withTiming.mock.calls[0]![2]).toBe(callback)
    expect(withDecay.mock.calls[0]![1]).toBe(callback)
    expect(callback).not.toHaveBeenCalled()
  })

  it('fires the callback synchronously for no-animation', () => {
    const callback = jest.fn()
    const result = buildReleaseAnimation({ type: 'no-animation' }, 42, callback)
    expect(result).toBe(42)
    expect(callback).toHaveBeenCalledTimes(1)
    expect(callback).toHaveBeenCalledWith(true, 42)
  })
})
