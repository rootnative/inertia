import { renderWithMotion } from '@onlynative/inertia/testing'
import * as Reanimated from 'react-native-reanimated'
import { MotionPath } from '../MotionPath'

// Reach into the rendered tree for the mock Path's props. The jest mock (see
// ../jest.setup.js) renders SVG primitives as plain Views that forward every
// prop; the Reanimated mock turns `createAnimatedComponent(Path)` into a
// forwardRef passthrough, so the `animatedProps` object reaches the leaf
// intact.
function getPathProps(result: ReturnType<typeof renderWithMotion>) {
  const json = result.toJSON() as { props: Record<string, unknown> } | null
  if (!json) throw new Error('rendered tree was null')
  return json.props
}

describe('MotionPath', () => {
  beforeEach(() => {
    jest.restoreAllMocks()
  })

  it('mounts with the static d and forwards it to Path', () => {
    const result = renderWithMotion(
      <MotionPath d="M 0 0 L 10 10 Z" testID="path" />,
    )
    expect(getPathProps(result).d).toBe('M 0 0 L 10 10 Z')
  })

  it('morphs d element-wise through withSpring by default', () => {
    const withSpring = jest.spyOn(Reanimated, 'withSpring')

    renderWithMotion(
      <MotionPath d="M 0 0 L 10 10" animate={{ d: 'M 5 5 L 20 20' }} />,
    )

    // 4 numeric params (M.x, M.y, L.x, L.y) → 4 withSpring calls.
    expect(withSpring).toHaveBeenCalledWith(5, expect.any(Object), undefined)
    expect(withSpring).toHaveBeenCalledWith(20, expect.any(Object), undefined)
    expect(withSpring).toHaveBeenCalledTimes(4)
  })

  it('reflects the morphed path in animatedProps.d after the effect flush', () => {
    const result = renderWithMotion(
      <MotionPath
        d="M 0 0 L 10 10 Z"
        animate={{ d: 'M 5 5 L 20 20 Z' }}
        transition={{ type: 'timing', duration: 200 }}
      />,
    )
    const animated = getPathProps(result).animatedProps as { d: string }
    expect(animated.d).toBe('M 5 5L 20 20Z')
  })

  it('animates fill and stroke as colors', () => {
    const withTiming = jest.spyOn(Reanimated, 'withTiming')

    renderWithMotion(
      <MotionPath
        d="M 0 0 L 10 10 Z"
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

  it('animates strokeWidth, opacity, and strokeDashoffset numerically', () => {
    const result = renderWithMotion(
      <MotionPath
        d="M 0 0 L 10 10 Z"
        strokeWidth={1}
        opacity={1}
        strokeDashoffset={0}
        animate={{ strokeWidth: 4, opacity: 0.3, strokeDashoffset: 100 }}
      />,
    )

    const animated = getPathProps(result).animatedProps as {
      strokeWidth: number
      opacity: number
      strokeDashoffset: number
    }
    expect(animated.strokeWidth).toBe(4)
    expect(animated.opacity).toBe(0.3)
    expect(animated.strokeDashoffset).toBe(100)
  })

  it('applies per-property transitions independently', () => {
    const withSpring = jest.spyOn(Reanimated, 'withSpring')
    const withTiming = jest.spyOn(Reanimated, 'withTiming')

    renderWithMotion(
      <MotionPath
        d="M 0 0 L 10 10"
        fill="#000"
        animate={{
          d: 'M 5 5 L 20 20',
          fill: '#fff',
        }}
        transition={{
          d: { type: 'spring', tension: 200 },
          fill: { type: 'timing', duration: 100 },
        }}
      />,
    )

    expect(withSpring).toHaveBeenCalledWith(5, expect.any(Object), undefined)
    expect(withTiming).toHaveBeenCalledWith(
      '#fff',
      expect.any(Object),
      undefined,
    )
  })

  it('throws in dev when animate.d has a different command sequence', () => {
    // (__DEV__ is true under the Jest setup — see root jest.setup.js)
    expect(() =>
      renderWithMotion(
        <MotionPath d="M 0 0 L 10 10 Z" animate={{ d: 'M 0 0 L 10 10' }} />,
      ),
    ).toThrow(/template mismatch|command count differs/)
  })

  it('throws in dev when the d prop template changes between renders', () => {
    const { rerender } = renderWithMotion(<MotionPath d="M 0 0 L 10 10 Z" />)
    expect(() => rerender(<MotionPath d="M 0 0 L 10 10" />)).toThrow(
      /d prop template changed after mount/,
    )
  })

  it('initial: false starts at the animate target — no mount animation', () => {
    const result = renderWithMotion(
      <MotionPath
        d="M 0 0 L 10 10 Z"
        initial={false}
        animate={{ d: 'M 5 5 L 20 20 Z' }}
      />,
    )

    const animated = getPathProps(result).animatedProps as { d: string }
    expect(animated.d).toBe('M 5 5L 20 20Z')
  })

  it('respects reduced motion by skipping interpolation', () => {
    jest.spyOn(Reanimated, 'useReducedMotion').mockReturnValue(true)
    const withSpring = jest.spyOn(Reanimated, 'withSpring')

    const result = renderWithMotion(
      <MotionPath d="M 0 0 L 10 10 Z" animate={{ d: 'M 5 5 L 20 20 Z' }} />,
    )

    expect(withSpring).not.toHaveBeenCalled()
    const animated = getPathProps(result).animatedProps as { d: string }
    expect(animated.d).toBe('M 5 5L 20 20Z')
  })
})
