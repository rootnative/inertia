// Minimal mock of react-native-svg. The real module loads a native renderer;
// for prop-shape unit tests we render plain Views that forward every prop so
// assertions can read the rendered tree directly. Each SVG element becomes a
// View with a `__svg` discriminator so tests can target a specific shape.
jest.mock('react-native-svg', () => {
  const React = require('react')
  const { View } = require('react-native')

  const make = (kind) => {
    const Component = React.forwardRef(({ children, ...props }, ref) =>
      React.createElement(
        View,
        { ...props, ref, testID: props.testID ?? `mock-svg-${kind}` },
        children,
      ),
    )
    Component.displayName = kind
    return Component
  }

  return {
    __esModule: true,
    default: make('Svg'),
    Svg: make('Svg'),
    Path: make('Path'),
    Circle: make('Circle'),
    Rect: make('Rect'),
    Line: make('Line'),
    Ellipse: make('Ellipse'),
    Polygon: make('Polygon'),
    Polyline: make('Polyline'),
    G: make('G'),
  }
})
