import * as fs from 'fs'
import * as path from 'path'
import { processColor, StyleSheet, Text } from 'react-native'
import { renderWithMotion } from '@rootnative/inertia/testing'
import { MotionLinearGradient } from '../MotionLinearGradient'

// The path Android takes: `nativeGradientView` returns the native view of
// expo-linear-gradient, and the component animates it directly.
jest.mock('../nativeGradientView', () => {
  const React = require('react')
  const { View } = require('react-native')
  const NativeView = React.forwardRef(
    (props: Record<string, unknown>, ref: unknown) =>
      React.createElement(View, {
        ...props,
        ref,
        testID: 'mock-native-gradient',
      }),
  )
  NativeView.displayName = 'ExpoLinearGradient'
  return { nativeGradientView: () => NativeView }
})

const CONTAINER_STYLE = { height: 40, borderRadius: 8, borderTopLeftRadius: 2 }

type Node = {
  props: Record<string, unknown>
  children: (Node | string)[] | null
}

function render(element: React.ReactElement) {
  const json = renderWithMotion(element).toJSON() as Node | null
  if (!json) throw new Error('rendered tree was null')
  const native = json.children?.[0]
  if (!native || typeof native === 'string') {
    throw new Error('the native gradient view was not rendered')
  }
  return { container: json, native }
}

describe('MotionLinearGradient on the native view', () => {
  it('animates processed colors and the native point props', () => {
    const { native } = render(
      <MotionLinearGradient
        colors={['#000000', '#000000']}
        animate={{
          colors: ['#ff0000', '#0000ff'],
          start: { x: 0.25, y: 0.5 },
          end: { x: 0.75, y: 0.5 },
        }}
        transition={{ type: 'timing', duration: 400 }}
      />,
    )

    expect(native.props.animatedProps).toEqual({
      colors: [processColor('#ff0000'), processColor('#0000ff')],
      startPoint: [0.25, 0.5],
      endPoint: [0.75, 0.5],
    })
  })

  it('animates locations when present', () => {
    const { native } = render(
      <MotionLinearGradient
        colors={['#000', '#fff']}
        locations={[0, 1]}
        animate={{ locations: [0.25, 0.75] }}
      />,
    )

    const animated = native.props.animatedProps as { locations?: unknown }
    expect(animated.locations).toEqual([0.25, 0.75])
  })

  it('seeds the native view with processed static props', () => {
    const { native } = render(
      <MotionLinearGradient
        colors={['#000000', '#ffffff']}
        start={{ x: 0, y: 1 }}
        end={{ x: 1, y: 0 }}
        locations={[0.2, 0.8]}
        dither={false}
      />,
    )

    expect(native.props.colors).toEqual([
      processColor('#000000'),
      processColor('#ffffff'),
    ])
    expect(native.props.startPoint).toEqual([0, 1])
    expect(native.props.endPoint).toEqual([1, 0])
    expect(native.props.locations).toEqual([0.2, 0.8])
    expect(native.props.dither).toBe(false)
    expect(native.props.style).toEqual(StyleSheet.absoluteFill)
  })

  it('wraps the native view in a container that carries the view props', () => {
    const { container, native } = render(
      <MotionLinearGradient
        colors={['#000', '#fff']}
        style={CONTAINER_STYLE}
        testID="hero"
      >
        <Text>label</Text>
      </MotionLinearGradient>,
    )

    expect(container.props.testID).toBe('hero')
    expect(container.props.style).toEqual(CONTAINER_STYLE)
    expect(native.props.borderRadii).toEqual([2, 2, 8, 8, 8, 8, 8, 8])
    expect(container.children).toHaveLength(2)
  })

  // A canary for an expo-linear-gradient update: the component renders the
  // internal native view directly, so it depends on the view name and the
  // prop names that the Android wrapper of the library uses.
  it('matches the native view that the expo-linear-gradient wrapper renders', () => {
    const root = path.dirname(
      require.resolve('expo-linear-gradient/package.json'),
    )
    const wrapper = fs.readFileSync(
      path.join(root, 'src', 'NativeLinearGradient.android.tsx'),
      'utf8',
    )

    expect(wrapper).toContain("requireNativeView('ExpoLinearGradient')")
    for (const prop of [
      'colors={colors}',
      'startPoint={startPoint}',
      'endPoint={endPoint}',
      'locations={locations}',
      'borderRadii={borderRadiiPerCorner}',
      'dither={dither}',
    ]) {
      expect(wrapper).toContain(prop)
    }
  })
})
