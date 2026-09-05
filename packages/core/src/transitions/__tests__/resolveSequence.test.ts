import * as Reanimated from 'react-native-reanimated'
import { resolveAnimatableValue } from '../resolveSequence'
import { __resetWarnOnceForTests } from '../../internal/warnOnce'

// `resolveAnimatableValue` turns a per-property `animate` value into a baked
// Reanimated animation. It handles the three shapes of `AnimatableValue`:
// a plain value, a single `{ to, ...override }` step, and an array of steps
// (→ `withSequence`). Like `resolveTransition`, it's a pure JS-thread function;
// the Reanimated mock returns identities, so we assert on the call signatures
// the spies capture rather than on return values. Sequence-level repeat
// hoisting and per-step override merging are the load-bearing behaviors here.

beforeEach(() => {
  jest.restoreAllMocks()
  __resetWarnOnceForTests()
})

describe('plain value', () => {
  it('resolves a single value through the base transition', () => {
    const withSpring = jest.spyOn(Reanimated, 'withSpring')
    const withSequence = jest.spyOn(Reanimated, 'withSequence')
    resolveAnimatableValue(100, { type: 'spring' })
    expect(withSpring).toHaveBeenCalledWith(100, expect.any(Object), undefined)
    expect(withSequence).not.toHaveBeenCalled()
  })

  it('requests an animation-phase callback (step undefined)', () => {
    const factory = jest.fn(() => undefined)
    resolveAnimatableValue(100, { type: 'spring' }, factory)
    expect(factory).toHaveBeenCalledTimes(1)
    expect(factory).toHaveBeenCalledWith('animation', undefined)
  })
})

describe('single step object', () => {
  it('lets the override type win outright over the base', () => {
    const withSpring = jest.spyOn(Reanimated, 'withSpring')
    const withTiming = jest.spyOn(Reanimated, 'withTiming')
    resolveAnimatableValue(
      { to: 100, type: 'timing', duration: 300 },
      { type: 'spring' },
    )
    expect(withTiming).toHaveBeenCalledWith(
      100,
      expect.objectContaining({ duration: 300 }),
      undefined,
    )
    expect(withSpring).not.toHaveBeenCalled()
  })

  it('inherits the base type when the override omits one', () => {
    const withTiming = jest.spyOn(Reanimated, 'withTiming')
    resolveAnimatableValue(
      { to: 100, duration: 999 },
      { type: 'timing', duration: 200 },
    )
    expect(withTiming).toHaveBeenCalledWith(
      100,
      expect.objectContaining({ duration: 999 }),
      undefined,
    )
  })
})

describe('sequence (array of steps)', () => {
  it('builds one withSequence call with an animation per step', () => {
    const withSequence = jest.spyOn(Reanimated, 'withSequence')
    const withSpring = jest.spyOn(Reanimated, 'withSpring')
    resolveAnimatableValue([0, 100, 0], { type: 'spring' })
    expect(withSequence).toHaveBeenCalledTimes(1)
    expect(withSequence.mock.calls[0]).toHaveLength(3)
    expect(withSpring).toHaveBeenCalledTimes(3)
  })

  it('applies per-step transition overrides independently', () => {
    const withSpring = jest.spyOn(Reanimated, 'withSpring')
    const withTiming = jest.spyOn(Reanimated, 'withTiming')
    resolveAnimatableValue([0, { to: 100, type: 'timing', duration: 300 }], {
      type: 'spring',
    })
    expect(withSpring).toHaveBeenCalledWith(0, expect.any(Object), undefined)
    expect(withTiming).toHaveBeenCalledWith(
      100,
      expect.objectContaining({ duration: 300 }),
      undefined,
    )
  })

  it('hoists repeat to the sequence level — steps do not each repeat', () => {
    const withRepeat = jest.spyOn(Reanimated, 'withRepeat')
    resolveAnimatableValue([0, 100, 0], { type: 'spring', repeat: 2 })
    // One repeat wraps the whole sequence; the three steps have it stripped.
    // `reverse` is not forwarded for a sequence: Reanimated only swaps the
    // wrapped animation's `toValue`, which a sequence ignores.
    expect(withRepeat).toHaveBeenCalledTimes(1)
    expect(withRepeat).toHaveBeenCalledWith(expect.anything(), 2, false)
  })

  it('does not forward alternate for a sequence and warns when it is explicit', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})
    const withRepeat = jest.spyOn(Reanimated, 'withRepeat')
    // Implicit alternate (number / 'infinite' / omitted flag): silent.
    resolveAnimatableValue([0, 100, 0], { type: 'spring', repeat: 'infinite' })
    resolveAnimatableValue([0, 100, 0], {
      type: 'spring',
      repeat: { count: 3 },
    })
    expect(warn).not.toHaveBeenCalled()
    // Explicit `alternate: true` on a sequence: warns once, still no reverse.
    resolveAnimatableValue([0, 100, 0], {
      type: 'spring',
      repeat: { count: 3, alternate: true },
    })
    resolveAnimatableValue([0, 100, 0], {
      type: 'spring',
      repeat: { count: 3, alternate: true },
    })
    expect(warn).toHaveBeenCalledTimes(1)
    expect(warn.mock.calls[0]![0]).toContain('alternate has no effect')
    for (const call of withRepeat.mock.calls) expect(call[2]).toBe(false)
  })

  it('requests a step-phase callback once per index', () => {
    const factory = jest.fn(() => undefined)
    resolveAnimatableValue([0, 100, 0], { type: 'spring' }, factory)
    expect(factory).toHaveBeenCalledTimes(3)
    expect(factory).toHaveBeenNthCalledWith(1, 'step', 0)
    expect(factory).toHaveBeenNthCalledWith(2, 'step', 1)
    expect(factory).toHaveBeenNthCalledWith(3, 'step', 2)
  })
})
