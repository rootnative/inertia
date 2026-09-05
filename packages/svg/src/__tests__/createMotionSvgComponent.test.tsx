import { render } from '@testing-library/react-native'
import { MotionConfig } from '@rootnative/inertia'
import { renderWithMotion } from '@rootnative/inertia/testing'
import * as Reanimated from 'react-native-reanimated'
import { Ellipse } from 'react-native-svg'
import { createMotionSvgComponent } from '../createMotionSvgComponent'
import { MotionCircle, MotionLine, MotionRect } from '../shapes'

// Same tree-reaching helper as the MotionPath tests: the jest mock renders
// SVG primitives as plain Views that forward every prop, so `animatedProps`
// reaches the leaf intact.
function getProps(result: ReturnType<typeof renderWithMotion>) {
  const json = result.toJSON() as { props: Record<string, unknown> } | null
  if (!json) throw new Error('rendered tree was null')
  return json.props
}

describe('createMotionSvgComponent', () => {
  beforeEach(() => {
    jest.restoreAllMocks()
  })

  it('mounts with static props forwarded to the wrapped element', () => {
    const result = renderWithMotion(
      <MotionCircle cx={50} cy={50} r={45} testID="circle" />,
    )
    const props = getProps(result)
    expect(props.cx).toBe(50)
    expect(props.cy).toBe(50)
    expect(props.r).toBe(45)
  })

  it('animates a numeric prop through withSpring by default', () => {
    const withSpring = jest.spyOn(Reanimated, 'withSpring')

    renderWithMotion(
      <MotionCircle cx={50} cy={50} r={10} animate={{ r: 40 }} />,
    )

    expect(withSpring).toHaveBeenCalledWith(40, expect.any(Object), undefined)
  })

  it('reflects animated numeric values in animatedProps after the effect flush', () => {
    const result = renderWithMotion(
      <MotionCircle
        cx={50}
        cy={50}
        r={45}
        strokeDashoffset={283}
        animate={{ strokeDashoffset: 70 }}
        transition={{ type: 'timing', duration: 300 }}
      />,
    )
    const animated = getProps(result).animatedProps as {
      strokeDashoffset: number
    }
    expect(animated.strokeDashoffset).toBe(70)
  })

  it('animates fill and stroke as colors', () => {
    const withTiming = jest.spyOn(Reanimated, 'withTiming')

    renderWithMotion(
      <MotionCircle
        cx={50}
        cy={50}
        r={45}
        fill="#000000"
        stroke="#ffffff"
        animate={{ fill: '#ff0000', stroke: '#00ff00' }}
        transition={{ type: 'timing', duration: 100 }}
      />,
    )

    expect(withTiming).toHaveBeenCalledWith(
      '#ff0000',
      expect.any(Object),
      undefined,
    )
    expect(withTiming).toHaveBeenCalledWith(
      '#00ff00',
      expect.any(Object),
      undefined,
    )
  })

  // A colour prop engaged only through `animate` has no static value to seed
  // from, so it falls back to the library default — which must be a colour
  // Reanimated recognises. `'transparent'` is the one CSS colour name its
  // `isColor()` rejects, and a slot resting at it cannot be animated away
  // from: the value takes the prefix-number-suffix branch, yields `NaN`, and
  // under the default spring never settles. Proven against the real driver in
  // core's `reanimated-drivers.test.ts`.
  it('seeds an animate-only color prop with an animatable transparent', () => {
    // Plain `render`, not `renderWithMotion`: the seed is what the slot holds
    // before the effect assigns the target, so it is only visible at mount.
    const json = render(
      <MotionCircle cx={50} cy={50} r={45} animate={{ fill: '#ff0000' }} />,
    ).toJSON() as { props: Record<string, unknown> } | null
    const animated = json!.props.animatedProps as { fill: string }

    expect(animated.fill).toBe('rgba(0, 0, 0, 0)')
  })

  it('animates strokeDasharray element-wise', () => {
    const result = renderWithMotion(
      <MotionCircle
        cx={50}
        cy={50}
        r={45}
        strokeDasharray={[10, 20]}
        animate={{ strokeDasharray: [30, 5] }}
      />,
    )
    const animated = getProps(result).animatedProps as {
      strokeDasharray: number[]
    }
    expect(animated.strokeDasharray).toEqual([30, 5])
  })

  it('throws in dev when animate strokeDasharray has a different length', () => {
    expect(() =>
      renderWithMotion(
        <MotionCircle
          cx={50}
          cy={50}
          r={45}
          strokeDasharray={[10, 20]}
          animate={{ strokeDasharray: [30, 5, 2] }}
        />,
      ),
    ).toThrow(/strokeDasharray length mismatch/)
  })

  it('throws in dev when a static array prop changes length after mount', () => {
    const { rerender } = renderWithMotion(
      <MotionCircle cx={50} cy={50} r={45} strokeDasharray={[10, 20]} />,
    )
    expect(() =>
      rerender(<MotionCircle cx={50} cy={50} r={45} strokeDasharray={[10]} />),
    ).toThrow(/strokeDasharray length changed after mount/)
  })

  it('applies per-property transitions independently', () => {
    const withSpring = jest.spyOn(Reanimated, 'withSpring')
    const withTiming = jest.spyOn(Reanimated, 'withTiming')

    renderWithMotion(
      <MotionCircle
        cx={50}
        cy={50}
        r={10}
        fill="#000"
        animate={{ r: 40, fill: '#fff' }}
        transition={{
          r: { type: 'spring', tension: 200 },
          fill: { type: 'timing', duration: 100 },
        }}
      />,
    )

    expect(withSpring).toHaveBeenCalledWith(40, expect.any(Object), undefined)
    expect(withTiming).toHaveBeenCalledWith(
      '#fff',
      expect.any(Object),
      undefined,
    )
  })

  it('resolves named transitions from the nearest MotionConfig', () => {
    const withTiming = jest.spyOn(Reanimated, 'withTiming')

    renderWithMotion(
      <MotionConfig
        transitions={{ determinate: { type: 'timing', duration: 250 } }}
      >
        <MotionCircle
          cx={50}
          cy={50}
          r={45}
          strokeDashoffset={283}
          animate={{ strokeDashoffset: 70 }}
          transition="determinate"
        />
      </MotionConfig>,
    )

    expect(withTiming).toHaveBeenCalledWith(
      70,
      expect.objectContaining({ duration: 250 }),
      undefined,
    )
  })

  it('resolves named transitions inside the per-property map', () => {
    const withTiming = jest.spyOn(Reanimated, 'withTiming')

    renderWithMotion(
      <MotionConfig
        transitions={{ 'ring-color': { type: 'timing', duration: 120 } }}
      >
        <MotionCircle
          cx={50}
          cy={50}
          r={45}
          stroke="#000"
          animate={{ stroke: '#fff' }}
          transition={{ stroke: 'ring-color' }}
        />
      </MotionConfig>,
    )

    expect(withTiming).toHaveBeenCalledWith(
      '#fff',
      expect.objectContaining({ duration: 120 }),
      undefined,
    )
  })

  it('initial seeds the first frame, then animates to the target', () => {
    const withSpring = jest.spyOn(Reanimated, 'withSpring')

    const result = renderWithMotion(
      <MotionCircle cx={50} cy={50} initial={{ r: 0 }} animate={{ r: 45 }} />,
    )

    expect(withSpring).toHaveBeenCalledWith(45, expect.any(Object), undefined)
    const animated = getProps(result).animatedProps as { r: number }
    expect(animated.r).toBe(45)
  })

  it('initial: false starts at the animate target — no mount animation', () => {
    const result = renderWithMotion(
      <MotionCircle
        cx={50}
        cy={50}
        r={10}
        initial={false}
        animate={{ r: 45 }}
      />,
    )
    const animated = getProps(result).animatedProps as { r: number }
    expect(animated.r).toBe(45)
  })

  it('respects reduced motion by skipping interpolation', () => {
    jest.spyOn(Reanimated, 'useReducedMotion').mockReturnValue(true)
    const withSpring = jest.spyOn(Reanimated, 'withSpring')

    const result = renderWithMotion(
      <MotionCircle cx={50} cy={50} r={10} animate={{ r: 45 }} />,
    )

    expect(withSpring).not.toHaveBeenCalled()
    const animated = getProps(result).animatedProps as { r: number }
    expect(animated.r).toBe(45)
  })

  it('only writes engaged keys into animatedProps', () => {
    // `opacity` is configured as animatable on MotionCircle but absent from
    // every mount source here — the worklet must not stomp it with a generic
    // seed (the element default is 1, a generic seed would be 0).
    const result = renderWithMotion(
      <MotionCircle cx={50} cy={50} r={45} animate={{ r: 40 }} />,
    )
    const animated = getProps(result).animatedProps as Record<string, unknown>
    expect('opacity' in animated).toBe(false)
    expect('fill' in animated).toBe(false)
    expect(animated.r).toBe(40)
  })

  it('warns in dev when an animate key is introduced after mount', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})

    const { rerender } = renderWithMotion(
      <MotionCircle cx={50} cy={50} r={45} animate={{ r: 40 }} />,
    )
    rerender(
      <MotionCircle cx={50} cy={50} r={45} animate={{ r: 40, opacity: 0.5 }} />,
    )

    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('animate.opacity was introduced after mount'),
    )
  })

  it('MotionRect and MotionLine animate their geometry props', () => {
    const rect = renderWithMotion(
      <MotionRect x={0} y={0} width={10} height={10} animate={{ width: 80 }} />,
    )
    expect((getProps(rect).animatedProps as { width: number }).width).toBe(80)

    const line = renderWithMotion(
      <MotionLine x1={0} y1={0} x2={10} y2={10} animate={{ x2: 90 }} />,
    )
    expect((getProps(line).animatedProps as { x2: number }).x2).toBe(90)
  })

  it('the factory wraps arbitrary SVG elements', () => {
    const MotionEllipse = createMotionSvgComponent(Ellipse, {
      animatableProps: ['cx', 'cy', 'rx', 'ry'],
      colorProps: ['fill'],
    })

    const result = renderWithMotion(
      <MotionEllipse
        cx={50}
        cy={50}
        rx={10}
        ry={20}
        fill="#000"
        animate={{ rx: 30, fill: '#7c3aed' }}
      />,
    )
    const animated = getProps(result).animatedProps as {
      rx: number
      fill: string
    }
    expect(animated.rx).toBe(30)
    expect(animated.fill).toBe('#7c3aed')
    expect(MotionEllipse.displayName).toBe('MotionEllipse')
  })
})

describe('createMotionSvgComponent — transition identity', () => {
  beforeEach(() => {
    jest.restoreAllMocks()
  })

  it('does not restart the animation when a parent re-renders with a fresh transition literal', () => {
    const withTiming = jest.spyOn(Reanimated, 'withTiming')
    const ui = () => (
      <MotionCircle
        cx={50}
        cy={50}
        r={10}
        fill="#000000"
        strokeDasharray={[10, 20]}
        animate={{ r: 40, fill: '#ff0000', strokeDasharray: [20, 10] }}
        transition={{ type: 'timing', duration: 300 }}
      />
    )
    const result = renderWithMotion(ui())
    const afterMount = withTiming.mock.calls.length
    // r, fill, and two strokeDasharray entries.
    expect(afterMount).toBe(4)

    result.rerender(ui())
    result.rerender(ui())
    expect(withTiming.mock.calls.length).toBe(afterMount)

    result.rerender(
      <MotionCircle
        cx={50}
        cy={50}
        r={10}
        fill="#000000"
        strokeDasharray={[10, 20]}
        animate={{ r: 40, fill: '#ff0000', strokeDasharray: [20, 10] }}
        transition={{ type: 'timing', duration: 600 }}
      />,
    )
    expect(withTiming.mock.calls.length).toBe(afterMount * 2)
  })
})

describe('createMotionSvgComponent — type-less spring config', () => {
  beforeEach(() => {
    jest.restoreAllMocks()
  })

  it('treats a spring config without `type` as the top-level transition', () => {
    const withSpring = jest.spyOn(Reanimated, 'withSpring')
    renderWithMotion(
      <MotionCircle
        cx={50}
        cy={50}
        r={10}
        animate={{ r: 40 }}
        transition={{ tension: 300, friction: 20 }}
      />,
    )
    expect(withSpring).toHaveBeenCalledTimes(1)
    const [target, config] = withSpring.mock.calls[0]!
    expect(target).toBe(40)
    expect(config).toMatchObject({ stiffness: 300, damping: 20 })
  })

  it('still reads a per-property map when keys are prop names', () => {
    const withTiming = jest.spyOn(Reanimated, 'withTiming')
    const withSpring = jest.spyOn(Reanimated, 'withSpring')
    renderWithMotion(
      <MotionCircle
        cx={50}
        cy={50}
        r={10}
        fill="#000000"
        animate={{ r: 40, fill: '#ff0000' }}
        transition={{ r: { type: 'timing', duration: 300 } }}
      />,
    )
    // `r` takes the mapped timing; `fill` has no entry and takes the default
    // spring.
    expect(withTiming).toHaveBeenCalledTimes(1)
    expect(withSpring).toHaveBeenCalledTimes(1)
  })
})
