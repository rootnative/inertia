/**
 * `@rootnative/inertia/reanimated` is a pure re-export surface — every
 * binding must be reference-identical to the one in
 * `react-native-reanimated`. Identity matters beyond API compatibility: the
 * Reanimated Babel plugin auto-workletizes callbacks passed to
 * `useAnimatedStyle` / `useAnimatedProps` / `useDerivedValue` by callee
 * name, so these must be the original functions under their original names,
 * not wrappers.
 */
import Reanimated, {
  Extrapolation,
  cancelAnimation,
  createAnimatedComponent,
  interpolate,
  interpolateColor,
  useAnimatedProps,
  useAnimatedStyle,
  useDerivedValue,
} from 'react-native-reanimated'
import * as interop from '../reanimated'

describe('@rootnative/inertia/reanimated interop subpath', () => {
  it('re-exports the Animated namespace by reference', () => {
    expect(interop.Animated).toBe(Reanimated)
  })

  it.each([
    ['Extrapolation', Extrapolation],
    ['cancelAnimation', cancelAnimation],
    ['createAnimatedComponent', createAnimatedComponent],
    ['interpolate', interpolate],
    ['interpolateColor', interpolateColor],
    ['useAnimatedProps', useAnimatedProps],
    ['useAnimatedStyle', useAnimatedStyle],
    ['useDerivedValue', useDerivedValue],
  ] as const)('re-exports %s by reference', (name, original) => {
    expect(interop[name as keyof typeof interop]).toBe(original)
  })

  it('exports nothing beyond the documented interop surface', () => {
    expect(Object.keys(interop).sort()).toEqual([
      'Animated',
      'Extrapolation',
      'cancelAnimation',
      'createAnimatedComponent',
      'interpolate',
      'interpolateColor',
      'useAnimatedProps',
      'useAnimatedStyle',
      'useDerivedValue',
    ])
  })
})
