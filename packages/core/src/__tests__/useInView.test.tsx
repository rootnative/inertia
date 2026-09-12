import { useRef, type ReactElement } from 'react'
import { act, render } from '@testing-library/react-native'
import { type SharedValue } from 'react-native-reanimated'
import { Motion } from '../motion'
import { __setSharedLayoutMeasurer, type MeasuredRect } from '../layout'
import { useScrollContext, type ScrollContextValue } from '../scroll'
import { useInView, type UseInViewOptions } from '../values/useInView'
import { __resetWarnOnceForTests } from '../internal/warnOnce'

const CONTAINER = { x: 0, y: 0, width: 320, height: 500 }

/** Where the element sits in window coordinates while the container is at 0. */
let elementRect: MeasuredRect = { x: 0, y: 600, width: 320, height: 100 }

let containerNode: unknown = null
let elementNode: unknown = null

/** Handles the test reaches in to drive the hook. */
interface Probe {
  progress?: SharedValue<number>
  scroll?: ScrollContextValue | null
}

function Watcher({
  probe,
  options,
}: {
  probe: Probe
  options?: UseInViewOptions
  /**
   * Bumped by `settle` for the sole purpose of defeating React's
   * reference-equal bail-out. Without a changing prop the inner component
   * never re-renders, and the Reanimated mock only re-runs a reaction on
   * render — so the shared values would move with nothing watching them.
   */
  tick?: number
}): ReactElement {
  const ref = useRef<unknown>(null)
  probe.scroll = useScrollContext()
  probe.progress = useInView(ref, options)

  return (
    <Motion.View
      ref={(node: unknown) => {
        ref.current = node
        elementNode = node
      }}
      testID="element"
    />
  )
}

/** A mounted tree, plus what `settle` needs to re-render it. */
interface Mounted {
  result: ReturnType<typeof render>
  build: (tick: number) => ReactElement
  tick: number
}

function mount(build: (tick: number) => ReactElement): Mounted {
  return { result: render(build(0)), build, tick: 0 }
}

function renderInScroller(probe: Probe, options?: UseInViewOptions): Mounted {
  return mount((tick) => (
    <Motion.ScrollView
      ref={(node: unknown) => {
        containerNode = node
      }}
    >
      <Watcher probe={probe} options={options} tick={tick} />
    </Motion.ScrollView>
  ))
}

/** Run the measurement frame the hook schedules on mount. */
async function settle(mounted: Mounted): Promise<void> {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0))
  })
  // The Reanimated mock re-runs the reaction on render, not on mutation, so an
  // observation needs a render after the shared values move.
  await act(async () => {
    mounted.tick += 1
    mounted.result.rerender(mounted.build(mounted.tick))
  })
}

/** Move the container's scroll offset, then let the reaction observe it. */
async function scrollTo(
  probe: Probe,
  mounted: Mounted,
  offset: number,
): Promise<void> {
  await act(async () => {
    if (probe.scroll) probe.scroll.offset.value = offset
  })
  await settle(mounted)
}

beforeEach(() => {
  containerNode = null
  elementNode = null
  elementRect = { x: 0, y: 600, width: 320, height: 100 }
  __resetWarnOnceForTests()
  __setSharedLayoutMeasurer((node) => {
    if (node !== null && node === containerNode) return CONTAINER
    if (node !== null && node === elementNode) return elementRect
    return undefined
  })
})

afterEach(() => {
  __setSharedLayoutMeasurer(undefined)
})

describe('useInView inside a Motion scroll container', () => {
  it('rests at 0 while the element is below the fold', async () => {
    const probe: Probe = {}
    const mounted = renderInScroller(probe)
    await settle(mounted)

    // The container is 500 tall and the element starts at 600 — off screen.
    expect(probe.progress?.value).toBe(0)
  })

  it('reaches 1 once the element scrolls into the container', async () => {
    const probe: Probe = {}
    const mounted = renderInScroller(probe)
    await settle(mounted)

    await scrollTo(probe, mounted, 150)

    expect(probe.progress?.value).toBe(1)
  })

  it('holds at 1 after scrolling away again, because `once` defaults to true', async () => {
    const probe: Probe = {}
    const mounted = renderInScroller(probe)
    await settle(mounted)

    await scrollTo(probe, mounted, 150)
    await scrollTo(probe, mounted, 0)

    expect(probe.progress?.value).toBe(1)
  })

  it('returns to 0 when `once` is false', async () => {
    const probe: Probe = {}
    const mounted = renderInScroller(probe, { once: false })
    await settle(mounted)

    await scrollTo(probe, mounted, 150)
    expect(probe.progress?.value).toBe(1)

    await scrollTo(probe, mounted, 0)
    expect(probe.progress?.value).toBe(0)
  })

  it('waits for `amount` of the element before it fires', async () => {
    const probe: Probe = {}
    const mounted = renderInScroller(probe, { amount: 1, once: false })
    await settle(mounted)

    // 40 of the element's 100 points are inside the container.
    await scrollTo(probe, mounted, 140)
    expect(probe.progress?.value).toBe(0)

    // All 100 are.
    await scrollTo(probe, mounted, 200)
    expect(probe.progress?.value).toBe(1)
  })

  it('fires early by `margin` points', async () => {
    const probe: Probe = {}
    const mounted = renderInScroller(probe, { margin: 80, once: false })
    await settle(mounted)

    // The element's top is 20 points past the container's bottom edge, which
    // the 80-point margin pulls inside the detection box.
    await scrollTo(probe, mounted, 80)
    expect(probe.progress?.value).toBe(1)
  })

  it('fires for an element longer than the container', async () => {
    // `amount: 1` on a 900-point element inside a 500-point container can
    // never be literally satisfied; the requirement caps at the container.
    elementRect = { x: 0, y: 600, width: 320, height: 900 }
    const probe: Probe = {}
    const mounted = renderInScroller(probe, { amount: 1, once: false })
    await settle(mounted)

    await scrollTo(probe, mounted, 600)
    expect(probe.progress?.value).toBe(1)
  })
})

describe('useInView with no scroll container', () => {
  it('reveals the element and warns once', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})
    const probe: Probe = {}

    const mounted = mount((tick) => <Watcher probe={probe} tick={tick} />)
    await settle(mounted)

    expect(probe.progress?.value).toBe(1)
    expect(warn).toHaveBeenCalledTimes(1)
    expect(warn.mock.calls[0]?.[0]).toContain('useInView')

    warn.mockRestore()
  })
})

describe('useInView when the element cannot be measured', () => {
  it('reveals rather than leaving the element stuck at 0', async () => {
    // A measurer that answers for nothing is what a detached node, or Paper's
    // asynchronous bridge, looks like to `measureWindowRect`.
    __setSharedLayoutMeasurer(() => undefined)

    const probe: Probe = {}
    const mounted = renderInScroller(probe)

    // Five frames of retries, then the fallback.
    for (let i = 0; i < 6; i++) await settle(mounted)

    expect(probe.progress?.value).toBe(1)
  })
})
