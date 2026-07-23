import { Pressable, StyleSheet, Text, View } from 'react-native'
import {
  Motion,
  MotionConfig,
  useAnimator,
  useColorTransition,
  useMotionValue,
} from '@rootnative/inertia'
import { useAnimatedStyle } from '@rootnative/inertia/reanimated'
import { ScreenShell } from './ScreenShell'

/**
 * `useAnimator` is the imperative counterpart to `useAnimation`: it returns a
 * setter you call from an event handler to push a `SharedValue<number>` toward
 * a target on demand, rather than re-firing from an effect on state change.
 *
 * The two things it gets right that a hand-written `resolveTransition` write in
 * an event handler silently gets wrong: registered `TransitionName`s resolve
 * through the nearest `<MotionConfig transitions>`, and reduced motion is
 * respected. This screen registers a `settle` timing transition on a
 * `MotionConfig` and drives a card's press feedback by name — press and release
 * to see the scale + color animate through the registered timing curve.
 */
const TRANSITIONS = {
  settle: { type: 'timing', duration: 220 } as const,
}

const REST = '#e4e4e7'
const ACTIVE = '#6750a4'

function Card() {
  const scale = useMotionValue(1)
  const progress = useMotionValue(0)
  const animate = useAnimator()

  const colorStyle = useColorTransition(progress, [REST, ACTIVE])
  const scaleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }))

  const onPressIn = () => {
    // Named transition — resolves against the MotionConfig registry above.
    animate(scale, 0.94, 'settle')
    animate(progress, 1, 'settle')
  }
  const onPressOut = () => {
    animate(scale, 1, 'settle')
    animate(progress, 0, 'settle')
  }

  return (
    <Pressable onPressIn={onPressIn} onPressOut={onPressOut}>
      <Motion.View style={[styles.card, colorStyle, scaleStyle]}>
        <Text style={styles.cardLabel}>Press me</Text>
      </Motion.View>
    </Pressable>
  )
}

export function UseAnimatorScreen({ onBack }: { onBack: () => void }) {
  return (
    <ScreenShell
      title="useAnimator"
      description="Imperative setter that resolves named transitions and respects reduced motion. Press the card — the scale and color animate through the 'settle' timing transition registered on the surrounding MotionConfig."
      onBack={onBack}
    >
      <MotionConfig transitions={TRANSITIONS}>
        <View style={styles.stage}>
          <Card />
        </View>
      </MotionConfig>
    </ScreenShell>
  )
}

const styles = StyleSheet.create({
  stage: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
  },
  card: {
    width: 160,
    height: 160,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#18181b',
  },
})
