import { Pressable, StyleSheet, Text, View } from 'react-native'
import Animated, { useAnimatedStyle, withSpring } from 'react-native-reanimated'
import { useMotionValue, useTransform } from '@rootnative/inertia'
import { ScreenShell } from './ScreenShell'

const RANGE = 120

/**
 * `useMotionValue` is the base escape-hatch primitive: a shared value owned
 * by JS, readable from worklets. There is deliberately no wrapper class —
 * what you get back interops with every Reanimated API directly.
 *
 * This screen writes to it from plain JS event handlers and derives two
 * values from it with `useTransform`:
 *
 * - the transformer overload (`useTransform(() => ...)`) computes scale from
 *   the distance to center, and
 * - the interpolation overload maps position onto a color ramp.
 *
 * A raw write (`x.value = 0`) snaps instantly; wrapping the target in
 * `withSpring` animates — the motion value is just a Reanimated shared
 * value, so all of Reanimated's animation helpers apply.
 */
export function UseMotionValueScreen({ onBack }: { onBack: () => void }) {
  const x = useMotionValue(0)

  // Transformer overload — arbitrary worklet derivation.
  const scale = useTransform(() => 1 + Math.abs(x.value) / (RANGE * 2))
  // Interpolation overload — numeric input onto a color ramp.
  const tint = useTransform(
    x,
    [-RANGE, 0, RANGE],
    ['#dc2626', '#4f46e5', '#059669'],
  )

  const dotStyle = useAnimatedStyle(() => ({
    backgroundColor: tint.value,
    transform: [{ translateX: x.value }, { scale: scale.value }],
  }))

  const springTo = (target: number) => {
    x.value = withSpring(target)
  }

  return (
    <ScreenShell
      title="useMotionValue"
      description="A JS-owned shared value driving position, scale (transformer overload), and color (interpolation overload) — with spring writes vs raw snap writes."
      onBack={onBack}
    >
      <View style={styles.track}>
        <Animated.View style={[styles.dot, dotStyle]} />
      </View>

      <View style={styles.buttonRow}>
        <Pressable
          onPress={() => springTo(-RANGE)}
          style={({ pressed }) => [
            styles.button,
            pressed && styles.buttonPressed,
          ]}
        >
          <Text style={styles.buttonLabel}>Left</Text>
        </Pressable>
        <Pressable
          onPress={() => springTo(0)}
          style={({ pressed }) => [
            styles.button,
            pressed && styles.buttonPressed,
          ]}
        >
          <Text style={styles.buttonLabel}>Center</Text>
        </Pressable>
        <Pressable
          onPress={() => springTo(RANGE)}
          style={({ pressed }) => [
            styles.button,
            pressed && styles.buttonPressed,
          ]}
        >
          <Text style={styles.buttonLabel}>Right</Text>
        </Pressable>
      </View>

      <Pressable
        onPress={() => {
          x.value = 0
        }}
        style={({ pressed }) => [styles.snap, pressed && styles.snapPressed]}
      >
        <Text style={styles.snapLabel}>Raw write — snap to center</Text>
      </Pressable>
    </ScreenShell>
  )
}

const styles = StyleSheet.create({
  track: {
    alignSelf: 'stretch',
    height: 96,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 16,
  },
  dot: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 22,
    backgroundColor: '#4f46e5',
    borderRadius: 10,
  },
  buttonPressed: {
    backgroundColor: '#4338ca',
  },
  buttonLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ffffff',
  },
  snap: {
    paddingVertical: 12,
    paddingHorizontal: 22,
    backgroundColor: '#1f2937',
    borderRadius: 10,
  },
  snapPressed: {
    backgroundColor: '#111827',
  },
  snapLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
})
