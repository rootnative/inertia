// Minimal mock of expo-linear-gradient. The real module loads a native view;
// for prop-shape unit tests we render a plain View that forwards every prop so
// assertions can read `colors` / `start` / `end` / `locations` off the rendered
// tree.
jest.mock('expo-linear-gradient', () => {
  const React = require('react')
  const { View } = require('react-native')
  const LinearGradient = React.forwardRef(({ children, ...props }, ref) =>
    React.createElement(
      View,
      { ...props, ref, testID: props.testID ?? 'mock-linear-gradient' },
      children,
    ),
  )
  LinearGradient.displayName = 'LinearGradient'
  return { __esModule: true, LinearGradient }
})
