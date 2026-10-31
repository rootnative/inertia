import { act, render } from '@testing-library/react-native'
import * as Reanimated from 'react-native-reanimated'
import { useHideOnScroll, useMotionValue, useScroll } from '../values'

// The Reanimated mock runs a reaction once per render, not on a mutation. So
// each step moves the offset, then re-renders to let the reaction observe it.

interface Probe {
  offset?: Reanimated.SharedValue<number>
  progress?: Reanimated.SharedValue<number>
}

function HookProbe({
  probe,
  distance,
  maxOffset,
  tick,
}: {
  probe: Probe
  distance: number
  maxOffset?: number
  /** Bumped by `scrollTo` to defeat React's reference-equal bail-out. */
  tick: number
}): null {
  const offset = useMotionValue(0)
  const end = useMotionValue(maxOffset ?? 0)
  probe.offset = offset
  probe.progress = useHideOnScroll(offset, {
    distance,
    maxOffset: maxOffset === undefined ? undefined : end,
  })
  void tick
  return null
}

function mount(distance = 80, maxOffset?: number) {
  const probe: Probe = {}
  let tick = 0
  const element = () => (
    <HookProbe
      probe={probe}
      distance={distance}
      maxOffset={maxOffset}
      tick={tick}
    />
  )
  const result = render(element())
  const scrollTo = (offset: number) => {
    act(() => {
      probe.offset!.value = offset
    })
    act(() => {
      tick += 1
      result.rerender(element())
    })
  }
  return { probe, scrollTo }
}

interface ScrollProbeState {
  onScroll?: (event: unknown) => void
  progress?: Reanimated.SharedValue<number>
}

function ScrollProbe({
  probe,
  tick,
}: {
  probe: ScrollProbeState
  tick: number
}): null {
  const { scrollY, onScroll } = useScroll()
  probe.onScroll = onScroll as unknown as (event: unknown) => void
  probe.progress = useHideOnScroll(scrollY, { distance: 80 })
  void tick
  return null
}

/** Content 1000 high in a 600-high viewport: the end is at 400. */
function scrollEvent(y: number) {
  return {
    contentOffset: { x: 0, y },
    contentSize: { width: 360, height: 1000 },
    layoutMeasurement: { width: 360, height: 600 },
    contentInset: { top: 0, left: 0, bottom: 0, right: 0 },
  }
}

function mountScroll() {
  const probe: ScrollProbeState = {}
  let tick = 0
  const result = render(<ScrollProbe probe={probe} tick={tick} />)
  const scrollTo = (y: number) => {
    act(() => {
      probe.onScroll!(scrollEvent(y))
    })
    act(() => {
      tick += 1
      result.rerender(<ScrollProbe probe={probe} tick={tick} />)
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

  it('does not count a bounce past the end of the content', () => {
    const { probe, scrollTo } = mount(80, 400)
    scrollTo(400)
    expect(probe.progress!.value).toBe(1)
    scrollTo(460)
    scrollTo(400)
    expect(probe.progress!.value).toBe(1)
    scrollTo(360)
    expect(probe.progress!.value).toBeCloseTo(0.5)
  })

  it('reads the end of the content from a useScroll offset', () => {
    const { probe, scrollTo } = mountScroll()
    scrollTo(400)
    expect(probe.progress!.value).toBe(1)
    scrollTo(460)
    scrollTo(400)
    expect(probe.progress!.value).toBe(1)
    scrollTo(360)
    expect(probe.progress!.value).toBeCloseTo(0.5)
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
