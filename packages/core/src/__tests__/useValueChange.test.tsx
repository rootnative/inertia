import { act, render } from '@testing-library/react-native'
import * as Reanimated from 'react-native-reanimated'
import { useDerivedValue, type SharedValue } from 'react-native-reanimated'
import { useMotionValue, useValueChange } from '../values'

// The Reanimated mock runs a reaction once per render, not on a mutation. So
// each step writes the value, then re-renders to let the reaction observe it.

interface Probe {
  value?: SharedValue<number>
}

function HookProbe({
  probe,
  onChange,
  tick,
}: {
  probe: Probe
  onChange: (current: number, previous: number) => void
  /** Bumped by `set` to defeat React's reference-equal bail-out. */
  tick: number
}): null {
  const value = useMotionValue(0)
  probe.value = value
  useValueChange(value, onChange)
  void tick
  return null
}

function mount(onChange: jest.Mock) {
  const probe: Probe = {}
  let tick = 0
  let callback = onChange
  const element = () => (
    <HookProbe probe={probe} onChange={callback} tick={tick} />
  )
  const result = render(element())
  const set = (next: number) => {
    act(() => {
      probe.value!.value = next
    })
    act(() => {
      tick += 1
      result.rerender(element())
    })
  }
  const swapCallback = (next: jest.Mock) => {
    callback = next
    act(() => {
      tick += 1
      result.rerender(element())
    })
  }
  return { set, swapCallback }
}

function DerivedProbe({
  probe,
  onChange,
  tick,
}: {
  probe: Probe
  onChange: (current: number, previous: number) => void
  tick: number
}): null {
  const offset = useMotionValue(0)
  probe.value = offset
  const page = useDerivedValue(() => Math.round(offset.value / 100))
  useValueChange(page, onChange)
  void tick
  return null
}

describe('useValueChange', () => {
  it('does not run for the initial value', () => {
    const onChange = jest.fn()
    mount(onChange)
    expect(onChange).not.toHaveBeenCalled()
  })

  it('calls back once per change with the new and the previous value', () => {
    const onChange = jest.fn()
    const { set } = mount(onChange)
    set(1)
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange).toHaveBeenLastCalledWith(1, 0)
    set(5)
    expect(onChange).toHaveBeenCalledTimes(2)
    expect(onChange).toHaveBeenLastCalledWith(5, 1)
  })

  it('is quiet on a re-render that changes nothing', () => {
    const onChange = jest.fn()
    const { set } = mount(onChange)
    set(2)
    set(2)
    expect(onChange).toHaveBeenCalledTimes(1)
  })

  it('calls the latest callback without a new reaction', () => {
    const first = jest.fn()
    const second = jest.fn()
    const spy = jest.spyOn(Reanimated, 'useAnimatedReaction')
    const { set, swapCallback } = mount(first)
    swapCallback(second)
    set(3)
    expect(first).not.toHaveBeenCalled()
    expect(second).toHaveBeenCalledWith(3, 0)
    // Every render hands the reaction the same worklet pair; the mock cannot
    // see identity, so the shape is what a test can pin.
    for (const call of spy.mock.calls) {
      expect(call).toHaveLength(2)
    }
    spy.mockRestore()
  })

  it('follows a derived value, so React hears one call per step', () => {
    const onChange = jest.fn()
    const probe: Probe = {}
    let tick = 0
    const element = () => (
      <DerivedProbe probe={probe} onChange={onChange} tick={tick} />
    )
    const result = render(element())
    const scrollTo = (next: number) => {
      act(() => {
        probe.value!.value = next
      })
      act(() => {
        tick += 1
        result.rerender(element())
      })
    }
    scrollTo(20)
    scrollTo(40)
    expect(onChange).not.toHaveBeenCalled()
    scrollTo(80)
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange).toHaveBeenLastCalledWith(1, 0)
    scrollTo(260)
    expect(onChange).toHaveBeenLastCalledWith(3, 1)
  })
})
