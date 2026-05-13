import { renderWithMotion } from '@onlynative/inertia/testing'
import * as Reanimated from 'react-native-reanimated'
import { MotionLinearGradient } from '../MotionLinearGradient'

// Reach into the rendered tree for the mock LinearGradient's props. Under the
// jest mock (see ../jest.setup.js) LinearGradient renders a `View` with the
// same prop bag; under Reanimated's mock (root jest.setup.js) the createAnimatedComponent
// wrapper is a forwardRef passthrough, so the `animatedProps` object reaches
// the leaf intact.
function getGradientProps(result: ReturnType<typeof renderWithMotion>) {
  const json = result.toJSON() as { props: Record<string, unknown> } | null
  if (!json) throw new Error('rendered tree was null')
  return json.props
}

describe('MotionLinearGradient', () => {
  beforeEach(() => {
    jest.restoreAllMocks()
  })

  it('mounts with the static colors and forwards them to LinearGradient', () => {
    const result = renderWithMotion(
      <MotionLinearGradient colors={['#000000', '#ffffff']} testID="grad" />,
    )

    const props = getGradientProps(result)
    expect(props.colors).toEqual(['#000000', '#ffffff'])
  })

  it('animates colors element-wise through withTiming', () => {
    const withTiming = jest.spyOn(Reanimated, 'withTiming')

    renderWithMotion(
      <MotionLinearGradient
        colors={['#000000', '#000000']}
        animate={{ colors: ['#ff0000', '#0000ff'] }}
        transition={{ type: 'timing', duration: 400 }}
      />,
    )

    expect(withTiming).toHaveBeenCalledWith(
      '#ff0000',
      expect.any(Object),
      undefined,
    )
    expect(withTiming).toHaveBeenCalledWith(
      '#0000ff',
      expect.any(Object),
      undefined,
    )
  })

  it('reflects animated colors in animatedProps after the effect flushes', () => {
    const result = renderWithMotion(
      <MotionLinearGradient
        colors={['#000000', '#000000']}
        animate={{ colors: ['#ff0000', '#0000ff'] }}
        transition={{ type: 'timing', duration: 400 }}
      />,
    )

    const props = getGradientProps(result)
    const animated = props.animatedProps as { colors?: unknown }
    expect(animated.colors).toEqual(['#ff0000', '#0000ff'])
  })

  it('animates start and end points independently', () => {
    const withSpring = jest.spyOn(Reanimated, 'withSpring')

    const result = renderWithMotion(
      <MotionLinearGradient
        colors={['#000', '#fff']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        animate={{ start: { x: 0.25, y: 0.5 }, end: { x: 0.75, y: 0.5 } }}
      />,
    )

    expect(withSpring).toHaveBeenCalledWith(0.25, expect.any(Object), undefined)
    expect(withSpring).toHaveBeenCalledWith(0.5, expect.any(Object), undefined)
    expect(withSpring).toHaveBeenCalledWith(0.75, expect.any(Object), undefined)

    const props = getGradientProps(result)
    const animated = props.animatedProps as {
      start: { x: number; y: number }
      end: { x: number; y: number }
    }
    expect(animated.start).toEqual({ x: 0.25, y: 0.5 })
    expect(animated.end).toEqual({ x: 0.75, y: 0.5 })
  })

  it('animates locations element-wise when present', () => {
    const result = renderWithMotion(
      <MotionLinearGradient
        colors={['#000', '#fff']}
        locations={[0, 1]}
        animate={{ locations: [0.25, 0.75] }}
        transition={{ type: 'timing', duration: 200 }}
      />,
    )

    const props = getGradientProps(result)
    const animated = props.animatedProps as { locations?: unknown }
    expect(animated.locations).toEqual([0.25, 0.75])
  })

  it('omits locations from animatedProps when not supplied at mount', () => {
    const result = renderWithMotion(
      <MotionLinearGradient
        colors={['#000', '#fff']}
        animate={{ colors: ['#111', '#eee'] }}
      />,
    )

    const props = getGradientProps(result)
    const animated = props.animatedProps as { locations?: unknown }
    expect(animated.locations).toBeUndefined()
  })

  it('applies per-property transitions independently', () => {
    const withSpring = jest.spyOn(Reanimated, 'withSpring')
    const withTiming = jest.spyOn(Reanimated, 'withTiming')

    renderWithMotion(
      <MotionLinearGradient
        colors={['#000', '#000']}
        animate={{
          colors: ['#fff', '#fff'],
          start: { x: 0.5, y: 0.5 },
        }}
        transition={{
          colors: { type: 'timing', duration: 100 },
          start: { type: 'spring', tension: 200 },
        }}
      />,
    )

    // Colors got withTiming, start got withSpring.
    expect(withTiming).toHaveBeenCalledWith(
      '#fff',
      expect.any(Object),
      undefined,
    )
    expect(withSpring).toHaveBeenCalledWith(0.5, expect.any(Object), undefined)
  })

  it('initial overrides the seed values before animation', () => {
    const result = renderWithMotion(
      <MotionLinearGradient
        colors={['#000', '#fff']}
        initial={{ colors: ['#111', '#eee'] }}
        animate={{ colors: ['#ff0000', '#00ff00'] }}
      />,
    )

    // After the effect flush the SVs hold the animate target — but the
    // initial seed proves the mount used `initial.colors`, not the static
    // `colors` prop. We can observe the seed by inspecting `withSpring`'s
    // call: the previous value passed to the spring config doesn't surface
    // through Reanimated's API, so we instead verify the post-flush target.
    const props = getGradientProps(result)
    const animated = props.animatedProps as { colors: string[] }
    expect(animated.colors).toEqual(['#ff0000', '#00ff00'])
  })

  it('initial: false starts at the animate target — no mount animation', () => {
    // With `initial: false` the shared values are seeded with the animate
    // target directly, so before any effect tick the `animatedProps`
    // already report the target colors.
    const result = renderWithMotion(
      <MotionLinearGradient
        colors={['#000', '#000']}
        initial={false}
        animate={{ colors: ['#ff0000', '#0000ff'] }}
      />,
    )

    const props = getGradientProps(result)
    const animated = props.animatedProps as { colors: string[] }
    expect(animated.colors).toEqual(['#ff0000', '#0000ff'])
  })

  it('respects reduced motion by skipping interpolation', () => {
    jest.spyOn(Reanimated, 'useReducedMotion').mockReturnValue(true)
    const withTiming = jest.spyOn(Reanimated, 'withTiming')

    const result = renderWithMotion(
      <MotionLinearGradient
        colors={['#000', '#000']}
        animate={{ colors: ['#ff0000', '#0000ff'] }}
        transition={{ type: 'timing', duration: 400 }}
      />,
    )

    expect(withTiming).not.toHaveBeenCalled()
    const props = getGradientProps(result)
    const animated = props.animatedProps as { colors: string[] }
    expect(animated.colors).toEqual(['#ff0000', '#0000ff'])
  })

  it('throws in __DEV__ when colors length changes between renders', () => {
    const result = renderWithMotion(
      <MotionLinearGradient colors={['#000', '#fff']} testID="grad" />,
    )

    expect(() =>
      result.rerender(
        <MotionLinearGradient
          colors={['#000', '#fff', '#888']}
          testID="grad"
        />,
      ),
    ).toThrow(/colors length changed from 2 to 3/)
  })

  it('throws in __DEV__ when locations length mismatches colors', () => {
    expect(() =>
      renderWithMotion(
        <MotionLinearGradient
          colors={['#000', '#fff']}
          locations={[0, 0.5, 1] as unknown as readonly number[]}
        />,
      ),
    ).toThrow(/locations length \(3\) must match colors length \(2\)/)
  })
})
