import { useMemo } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import Animated, {
  interpolateColor,
  useAnimatedStyle,
} from 'react-native-reanimated'
import { useGesture } from '@rootnative/inertia'
import { ScreenShell } from './ScreenShell'

const PALETTE = {
  surface: '#f3f4f6',
  hovered: '#e0e7ff',
  focused: '#c7d2fe',
  pressed: '#a5b4fc',
  ring: '#4f46e5',
  text: '#111827',
  subtext: '#4b5563',
}

const TRANSITION = {
  hovered: { type: 'timing' as const, duration: 150 },
  focused: { type: 'timing' as const, duration: 200 },
  focusVisible: { type: 'timing' as const, duration: 200 },
  pressed: { type: 'timing' as const, duration: 100 },
}

const HOVER_ALPHA = 0.08
const FOCUS_ALPHA = 0.1
const PRESS_ALPHA = 0.1

export function UseGestureScreen({ onBack }: { onBack: () => void }) {
  return (
    <ScreenShell
      title="useGesture"
      description="The hook-form of the gesture prop. Returns 0↔1 progress shared values for pressed / focused / focusVisible / hovered, plus a handler bag to spread on a Pressable. Use it when one gesture drives multiple animated siblings."
      onBack={onBack}
    >
      <Card />
      <ButtonWithRing />
      <Halo />
    </ScreenShell>
  )
}

function Card() {
  const { pressed, focused, hovered, handlers } = useGesture(TRANSITION)

  const animatedStyle = useAnimatedStyle(() => {
    const hoveredBg = interpolateColor(
      hovered.value,
      [0, 1],
      [PALETTE.surface, PALETTE.hovered],
    )
    const focusedBg = interpolateColor(
      focused.value,
      [0, 1],
      [hoveredBg, PALETTE.focused],
    )
    const pressedBg = interpolateColor(
      pressed.value,
      [0, 1],
      [focusedBg, PALETTE.pressed],
    )
    return { backgroundColor: pressedBg }
  })

  const cardStyle = useMemo(() => [styles.card, animatedStyle], [animatedStyle])

  return (
    <View style={styles.demo}>
      <Text style={styles.demoLabel}>Layered state colours</Text>
      <Text style={styles.demoBody}>
        Each layer fades its own progress; the worklet chains them via
        interpolateColor exactly as MD3 spec.
      </Text>
      <AnimatedPressable {...handlers} style={cardStyle}>
        <Text style={styles.cardLabel}>Hover / focus / press me</Text>
      </AnimatedPressable>
    </View>
  )
}

function ButtonWithRing() {
  const { focusVisible, handlers } = useGesture(TRANSITION)

  const ringStyle = useAnimatedStyle(() => ({
    opacity: focusVisible.value,
  }))
  const composedRingStyle = useMemo(() => [styles.ring, ringStyle], [ringStyle])

  return (
    <View style={styles.demo}>
      <Text style={styles.demoLabel}>Sibling focus ring</Text>
      <Text style={styles.demoBody}>
        Focus ring is a sibling Animated.View positioned around the Pressable.
        Its opacity reads from focusVisible — keyboard focus only.
      </Text>
      <View style={styles.ringWrapper}>
        <Animated.View pointerEvents="none" style={composedRingStyle} />
        <Pressable {...handlers} style={styles.button}>
          <Text style={styles.buttonLabel}>Tab here</Text>
        </Pressable>
      </View>
    </View>
  )
}

function Halo() {
  const { pressed, focused, hovered, handlers } = useGesture(TRANSITION)

  // MD3 state-layer halo: opacity is the max of each layer's contribution.
  // This shape is what `gesture={...}` can't express — there isn't a single
  // style key being lerped; it's an aggregate over multiple layers.
  const haloStyle = useAnimatedStyle(() => ({
    opacity: Math.max(
      hovered.value * HOVER_ALPHA,
      focused.value * FOCUS_ALPHA,
      pressed.value * PRESS_ALPHA,
    ),
  }))
  const composedHaloStyle = useMemo(() => [styles.halo, haloStyle], [haloStyle])

  return (
    <View style={styles.demo}>
      <Text style={styles.demoLabel}>MD3 state-layer halo</Text>
      <Text style={styles.demoBody}>
        Halo opacity = max(hovered·0.08, focused·0.10, pressed·0.10). The
        max-blend over multiple layers is exactly what useGesture unlocks.
      </Text>
      <View style={styles.haloWrapper}>
        <Animated.View pointerEvents="none" style={composedHaloStyle} />
        <Pressable {...handlers} style={styles.haloTarget}>
          <Text style={styles.buttonLabel}>Interact</Text>
        </Pressable>
      </View>
    </View>
  )
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable)

const styles = StyleSheet.create({
  demo: {
    width: 280,
    gap: 6,
  },
  demoLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: PALETTE.text,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  demoBody: {
    fontSize: 13,
    color: PALETTE.subtext,
    lineHeight: 18,
    marginBottom: 4,
  },
  card: {
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  cardLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: PALETTE.text,
  },
  ringWrapper: {
    alignSelf: 'flex-start',
    padding: 6,
  },
  ring: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 14,
    borderWidth: 3,
    borderColor: PALETTE.ring,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    backgroundColor: PALETTE.surface,
  },
  buttonLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: PALETTE.text,
  },
  haloWrapper: {
    alignSelf: 'flex-start',
    padding: 6,
  },
  halo: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 999,
    backgroundColor: PALETTE.ring,
  },
  haloTarget: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 999,
    backgroundColor: PALETTE.surface,
  },
})
