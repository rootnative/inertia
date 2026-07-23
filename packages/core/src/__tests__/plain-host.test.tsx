import { render } from '@testing-library/react-native'
import { StyleSheet, Text } from 'react-native'
import * as Reanimated from 'react-native-reanimated'
import { Motion, Presence } from '../index'

const styles = StyleSheet.create({
  box100: { width: 100 },
  box200: { width: 200 },
  box300: { width: 300 },
  boxSquare: { width: 100, height: 100 },
  red: { color: 'red' },
})

// Proposal item 5 (value-layer-interpolation-hooks): a `Motion.*` primitive
// carrying NONE of the animation-driving props (initial / animate / exit /
// gesture / layout / variants / controller / layoutId / onAnimationEnd /
// transition) is a zero-cost pass-through over
// `Animated.createAnimatedComponent(Component)` — no shared values, no
// `useAnimatedStyle` worklet, no gesture state, no per-render animation
// allocation. These tests pin that guarantee: the plain host allocates none of
// the machinery the animated body does, and switching a prop on flips it to
// the full animated path.

beforeEach(() => {
  jest.restoreAllMocks()
})

describe('plain host — zero-cost pass-through', () => {
  it('a prop-less Motion.View allocates no shared values or worklets', () => {
    const useSharedValue = jest.spyOn(Reanimated, 'useSharedValue')
    const useAnimatedStyle = jest.spyOn(Reanimated, 'useAnimatedStyle')
    const withSpring = jest.spyOn(Reanimated, 'withSpring')
    const withTiming = jest.spyOn(Reanimated, 'withTiming')

    render(
      <Motion.View style={styles.box100}>
        <Text>plain</Text>
      </Motion.View>,
    )

    expect(useSharedValue).not.toHaveBeenCalled()
    expect(useAnimatedStyle).not.toHaveBeenCalled()
    expect(withSpring).not.toHaveBeenCalled()
    expect(withTiming).not.toHaveBeenCalled()
  })

  it('stays allocation-free across re-renders', () => {
    const useSharedValue = jest.spyOn(Reanimated, 'useSharedValue')
    const useAnimatedStyle = jest.spyOn(Reanimated, 'useAnimatedStyle')

    const { rerender } = render(<Motion.View style={styles.box100} />)
    rerender(<Motion.View style={styles.box200} />)
    rerender(<Motion.View style={styles.box300} />)

    expect(useSharedValue).not.toHaveBeenCalled()
    expect(useAnimatedStyle).not.toHaveBeenCalled()
  })

  it('a static style still renders through to the host', () => {
    const { getByTestId } = render(
      <Motion.View testID="host" style={styles.boxSquare} />,
    )
    // The host receives the style untouched (no animated-style array wrapper).
    expect(getByTestId('host').props.style).toBe(styles.boxSquare)
  })

  it('forwards a ref to the underlying host', () => {
    const ref = jest.fn()
    render(<Motion.View ref={ref} />)
    expect(ref).toHaveBeenCalled()
  })

  it('the presence of an animation prop opts back into the full body', () => {
    const useSharedValue = jest.spyOn(Reanimated, 'useSharedValue')
    const useAnimatedStyle = jest.spyOn(Reanimated, 'useAnimatedStyle')

    render(<Motion.View animate={{ opacity: 1 }} />)

    // Full animated body: shared values + a useAnimatedStyle worklet.
    expect(useSharedValue).toHaveBeenCalled()
    expect(useAnimatedStyle).toHaveBeenCalled()
  })

  it('does not allocate for a style-only Text primitive either', () => {
    const useSharedValue = jest.spyOn(Reanimated, 'useSharedValue')
    render(<Motion.Text style={styles.red}>hi</Motion.Text>)
    expect(useSharedValue).not.toHaveBeenCalled()
  })
})

describe('plain host — Presence coordination', () => {
  it('a prop-less child inside Presence removes itself on exit (no lingering)', () => {
    const { queryByTestId, rerender } = render(
      <Presence>
        <Motion.View key="a" testID="child" />
      </Presence>,
    )
    expect(queryByTestId('child')).not.toBeNull()

    // Remove it from the incoming list. With no exit animation, the plain host
    // must signal safeToRemove immediately — the child should be gone, not
    // stuck in the exiting snapshot.
    rerender(<Presence>{null}</Presence>)
    expect(queryByTestId('child')).toBeNull()
  })
})
