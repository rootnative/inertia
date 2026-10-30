import { act, render } from '@testing-library/react-native'
import * as Reanimated from 'react-native-reanimated'
import { useHideOnScroll, useMotionValue } from '../values'

// The Reanimated mock runs a reaction once per render, not on a mutation. So
// each step moves the offset, then re-renders to let the reaction observe it.

interface Probe {
  offset?: Reanimated.SharedValue<number>
  progress?: Reanimated.SharedValue<number>
}

function HookProbe({
  probe,
  distance,
  tick,
}: {
  probe: Probe
  distance: number
  /** Bumped by `scrollTo` to defeat React's reference-equal bail-out. */
  tick: number
}): null {
  const offset = useMotionValue(0)
  probe.offset = offset
  probe.progress = useHideOnScroll(offset, { distance })
  void tick
  return null
}

function mount(distance = 80) {
  const probe: Probe = {}
  let tick = 0
  const result = render(
    <HookProbe probe={probe} distance={distance} tick={tick} />,
  )
  const scrollTo = (offset: number) => {
    act(() => {
      probe.offset!.value = offset
    })
    act(() => {
      tick += 1
      result.rerender(
        <HookProbe probe={probe} distance={distance} tick={tick} />,
      )
    })
  }
  return { probe, scrollTo }
}

describe('useHideOnScroll', () => {
  it('rests at 0', () => {
    const { probe } = mount()
    expect(probe.progress!.value).toBe(0)
  })

  it('rises with a scroll down, one point of scroll for one point of distance', () => {
    const { probe, scrollTo } = mount(80)
    scrollTo(20)
    expect(probe.progress!.value).toBeCloseTo(0.25)
    scrollTo(60)
    expect(probe.progress!.value).toBeCloseTo(0.75)
  })

  it('clamps at 1 on a long scroll down', () => {
    const { probe, scrollTo } = mount(80)
    scrollTo(500)
    expect(probe.progress!.value).toBe(1)
    scrollTo(900)
    expect(probe.progress!.value).toBe(1)
  })

  it('falls with a scroll up from anywhere, not only from the top', () => {
    const { probe, scrollTo } = mount(80)
    scrollTo(500)
    scrollTo(460)
    expect(probe.progress!.value).toBeCloseTo(0.5)
    scrollTo(380)
    expect(probe.progress!.value).toBe(0)
  })

  it('is 0 at the top and after an overscroll bounce', () => {
    const { probe, scrollTo } = mount(80)
    scrollTo(500)
    scrollTo(0)
    expect(probe.progress!.value).toBe(0)
    scrollTo(500)
    scrollTo(-40)
    expect(probe.progress!.value).toBe(0)
  })

  it('passes no dependency list to its reaction', () => {
    const spy = jest.spyOn(Reanimated, 'useAnimatedReaction')
    mount()
    expect(spy).toHaveBeenCalled()
    for (const call of spy.mock.calls) {
      expect(call).toHaveLength(2)
    }
    spy.mockRestore()
  })
})
